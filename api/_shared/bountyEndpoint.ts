import { facilitator } from '@payai/facilitator';
import {
  HTTPFacilitatorClient,
  x402HTTPResourceServer,
  x402ResourceServer,
} from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { bazaarResourceServerExtension, declareDiscoveryExtension } from '@x402/extensions/bazaar';
import { ZodError } from 'zod';

import { BountyCheckError, inspectGitHubBounty, parseBountyCheckRequest } from './bountyCheck.js';
import { createPaymentContext } from './bountyPaymentContext.js';
import { BOUNTY_CHECK_PATH, BOUNTY_CHECK_URL } from './bountyRoute.js';
import { ApiHttpError, methodNotAllowed, parseJsonBody, sendData, sendError } from './http.js';
import type { VercelRequest, VercelResponse } from './vercel.js';

const FIVE_EVM_ADDRESS = '0x37C061eC90b8C08E2D6F362E26a98Ce5A7C66F09';
const BASE_MAINNET = 'eip155:8453';
const bountyDiscovery = declareDiscoveryExtension({
  input: { issueUrl: 'https://github.com/owner/repository/issues/123' },
  inputSchema: {
    properties: {
      issueUrl: {
        type: 'string',
        format: 'uri',
        description: 'A public GitHub issue URL.',
      },
    },
    required: ['issueUrl'],
  },
  bodyType: 'json',
  output: {
    example: {
      assessment: { decision: 'manual-review', riskScore: 40, reasons: [] },
      funding: { status: 'signal-found', signals: ['bounty label or text'] },
      competition: { count: 0, referencedPullRequests: [] },
    },
  },
});
const x402Server = createX402Server();
let x402Initialization: Promise<void> | undefined;

export async function handleBountyCheck(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return sendData(res, {
      service: 'FIVE Bounty Due Diligence',
      endpoint: BOUNTY_CHECK_URL,
      method: 'POST',
      protocol: 'x402',
      network: BASE_MAINNET,
      asset: 'USDC',
      price: '$1.00',
      input: { issueUrl: 'https://github.com/owner/repository/issues/123' },
      description:
        'Checks public GitHub issue, repository, competition, staleness, and funding signals before an agent commits work.',
      paymentNote: 'A valid payment is settled only after a successful report is produced.',
    });
  }
  if (req.method !== 'POST') return methodNotAllowed(res, req.method);

  const context = createPaymentContext(req);
  try {
    await ensureX402Initialized();
    const payment = await x402Server.processHTTPRequest(context);
    if (payment.type === 'payment-error') return sendX402Response(res, payment.response);
    if (payment.type === 'no-payment-required') {
      return sendError(res, 'server_error', 'Payment protection is unavailable.', 500);
    }

    try {
      const request = parseBountyCheckRequest(parseJsonBody(req));
      const report = await inspectGitHubBounty(request, {
        githubToken: process.env.GITHUB_TOKEN,
      });
      const responseBody = { data: report };
      const settlement = await x402Server.processSettlement(
        payment.paymentPayload,
        payment.paymentRequirements,
        payment.declaredExtensions,
        {
          request: context,
          responseBody: Buffer.from(JSON.stringify(responseBody)),
          responseHeaders: { 'content-type': 'application/json' },
        },
      );
      if (!settlement.success) return sendX402Response(res, settlement.response);
      for (const [name, value] of Object.entries(settlement.headers)) res.setHeader(name, value);
      return sendData(res, report);
    } catch (error) {
      await payment.cancellationDispatcher.cancel({
        reason: 'handler_failed',
        error,
        responseStatus:
          error instanceof BountyCheckError || error instanceof ApiHttpError
            ? error.status
            : error instanceof ZodError
              ? 400
              : 500,
      });
      if (error instanceof ZodError) {
        return sendError(res, 'bad_request', error.issues[0]?.message ?? 'Invalid request body', 400);
      }
      if (error instanceof BountyCheckError) {
        const code = error.status === 404 ? 'not_found' : error.status === 400 ? 'bad_request' : 'server_error';
        return sendError(res, code, error.message, error.status);
      }
      if (error instanceof ApiHttpError && error.status < 500) {
        return sendError(res, error.code, error.message, error.status);
      }
      throw error;
    }
  } catch (error) {
    console.error('x402 bounty check failed', error);
    return sendError(res, 'server_error', 'The paid bounty check is temporarily unavailable.', 503);
  }
}

function createX402Server() {
  const resourceServer = new x402ResourceServer(new HTTPFacilitatorClient(facilitator))
    .register(BASE_MAINNET, new ExactEvmScheme())
    .registerExtension(bazaarResourceServerExtension);
  return new x402HTTPResourceServer(resourceServer, {
    [`POST ${BOUNTY_CHECK_PATH}`]: {
      accepts: {
        scheme: 'exact',
        price: '$1.00',
        network: BASE_MAINNET,
        payTo: FIVE_EVM_ADDRESS,
      },
      resource: BOUNTY_CHECK_URL,
      description: 'Analyze a public GitHub issue for bounty eligibility, competition, activity, and funding risk.',
      mimeType: 'application/json',
      serviceName: 'FIVE Bounty Due Diligence',
      tags: ['github', 'bounty', 'due-diligence', 'agents'],
      unpaidResponseBody: () => ({
        contentType: 'application/json',
        body: {
          error: 'Payment required',
          price: '$1.00 USDC',
          network: BASE_MAINNET,
          docs: BOUNTY_CHECK_URL,
        },
      }),
      settlementFailedResponseBody: (_context, result) => ({
        contentType: 'application/json',
        body: { error: 'Payment settlement failed', reason: result.errorReason },
      }),
      extensions: { ...bountyDiscovery },
    },
  });
}

function ensureX402Initialized() {
  x402Initialization ??= x402Server.initialize().catch((error) => {
    x402Initialization = undefined;
    throw error;
  });
  return x402Initialization;
}

function sendX402Response(
  res: VercelResponse,
  response: { status: number; headers: Record<string, string>; body?: unknown; isHtml?: boolean },
) {
  for (const [name, value] of Object.entries(response.headers)) res.setHeader(name, value);
  res.status(response.status);
  if (response.isHtml) return res.end(String(response.body ?? ''));
  return res.json(response.body ?? {});
}
