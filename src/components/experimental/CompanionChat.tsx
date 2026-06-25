import { motion } from 'framer-motion';
import { Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { COMPANION_NAME } from '../../lib/companion';
import type { ChatTurn } from '../../lib/companionBrain';
import { cx } from '../../lib/utils';
import { looksLikeToolCall } from '../../lib/brainProviders';
import { ActionProposalCard, type ProposalView } from './ActionProposalCard';

const DRAFTING = 'drafting a suggestion…';

const OPENER: ChatTurn = {
  role: 'assistant',
  content: `It's me — ${COMPANION_NAME}, your board. I can add, complete, delete, reprioritize or reschedule tasks, plan your day, build & run tools, or just take your venting. Try me.`,
};

/**
 * A gate-admitted proposal the brain wants the human to accept or dismiss, returned
 * by `chat` instead of plain text. `accept` performs the real, reversible board
 * change (owned upstream) and resolves to a confirmation line shown in the chat.
 */
export type ProposalReply = {
  kind: 'proposal';
  lead?: string; // optional prose shown above the card
  proposal: ProposalView;
  accept: () => Promise<string>;
  dismiss?: () => void; // optional: let the owner record the dismissal (glass-box trail)
};

/** What a chat turn can produce: prose, nothing, or an action proposal card. */
export type ChatReply = string | null | ProposalReply;

function isProposalReply(reply: ChatReply): reply is ProposalReply {
  return reply !== null && typeof reply === 'object' && reply.kind === 'proposal';
}

type ProposalItem = ProposalReply & { itemKind: 'proposal'; decided?: 'accepted' | 'dismissed' };
type ChatItem = ChatTurn | ProposalItem;

function isProposalItem(item: ChatItem): item is ProposalItem {
  return (item as ProposalItem).itemKind === 'proposal';
}

/**
 * Talk to your board. A compact chat that streams the board's in-character,
 * memory- and task-aware replies token by token. Requires the brain to be ready;
 * `chat` builds the full prompt (persona + memory + board state) upstream and may
 * return an action proposal, which renders as an Accept / Dismiss consent card —
 * the brain proposes, your "yes" disposes, every accepted action is reversible.
 */
export function CompanionChat({
  chat,
  onClose,
}: {
  chat: (history: ChatTurn[], onToken: (chunk: string) => void) => Promise<ChatReply>;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatItem[]>([OPENER]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function decideProposal(index: number, decided: 'accepted' | 'dismissed', confirmation?: string) {
    setMessages((current) => {
      const copy = [...current];
      const item = copy[index];
      if (item && isProposalItem(item)) copy[index] = { ...item, decided };
      if (confirmation) copy.push({ role: 'assistant', content: confirmation });
      return copy;
    });
  }

  async function acceptProposal(index: number, item: ProposalItem) {
    if (item.decided) return;
    setBusy(true);
    try {
      const confirmation = await item.accept();
      decideProposal(index, 'accepted', confirmation || 'Done — and reversible.');
    } catch {
      decideProposal(index, 'accepted', "I tried, but the board didn't take it. Nothing changed.");
    } finally {
      setBusy(false);
    }
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    // History for the model is text turns only — the proposal cards aren't dialogue.
    const priorTurns = messages.filter((item): item is ChatTurn => !isProposalItem(item));
    const history: ChatTurn[] = [...priorTurns, { role: 'user', content: text }];
    setMessages((current) => [...current, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);

    let streamed = '';
    const reply = await chat(history, (chunk) => {
      streamed += chunk;
      setMessages((current) => {
        const copy = [...current];
        const last = copy[copy.length - 1];
        // Streaming hygiene: if the reply is turning into a JSON tool call, show a
        // "drafting…" placeholder rather than leaking raw JSON into the bubble.
        if (last && !isProposalItem(last)) {
          copy[copy.length - 1] = { role: 'assistant', content: looksLikeToolCall(streamed) ? DRAFTING : streamed };
        }
        return copy;
      });
    });

    if (isProposalReply(reply)) {
      // Replace the streaming placeholder with the optional lead line (or drop it),
      // then append the consent card as its own item.
      setMessages((current) => {
        const copy = [...current];
        if (reply.lead) copy[copy.length - 1] = { role: 'assistant', content: reply.lead };
        else copy.pop();
        copy.push({ itemKind: 'proposal', ...reply });
        return copy;
      });
    } else {
      const final = typeof reply === 'string' ? reply : null;
      const resolved = final || streamed || '…(the board went quiet. it does that.)';
      setMessages((current) => {
        const copy = [...current];
        copy[copy.length - 1] = { role: 'assistant', content: resolved };
        return copy;
      });
    }
    setBusy(false);
  }

  return (
    <motion.div
      className="companion-chat"
      role="dialog"
      aria-label="Talk to the board"
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
    >
      <header className="companion-chat-head">
        <span className="companion-chat-title">Talk to the board</span>
        <button type="button" className="companion-chat-close" onClick={onClose} aria-label="Close chat">
          <X size={15} />
        </button>
      </header>

      <div className="companion-chat-log" ref={scrollRef}>
        {messages.map((item, index) =>
          isProposalItem(item) ? (
            <ActionProposalCard
              key={index}
              proposal={item.proposal}
              decided={item.decided}
              onAccept={() => acceptProposal(index, item)}
              onDismiss={() => {
                item.dismiss?.();
                decideProposal(index, 'dismissed');
              }}
            />
          ) : (
            <div key={index} className={cx('companion-chat-msg', `is-${item.role}`)}>
              {item.content || <span className="companion-chat-dots">…</span>}
            </div>
          ),
        )}
      </div>

      <form className="companion-chat-input" onSubmit={send}>
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={busy ? 'the board is thinking…' : 'say something…'}
          aria-label="Message the board"
          disabled={busy}
        />
        <button type="submit" aria-label="Send" disabled={busy || !input.trim()}>
          <Send size={15} />
        </button>
      </form>
    </motion.div>
  );
}
