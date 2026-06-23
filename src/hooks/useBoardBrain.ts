import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DEFAULT_MODEL_ID,
  loadBrain,
  modelLabel,
  nextModelId,
  type BrainMessage,
  type GenerateFn,
  type OnToken,
} from '../lib/companionBrain';
import { encodeRemoteId, type RemoteBrainConfig } from '../lib/brainProviders';

const ENABLED_KEY = 'next-task:brain';
const MODEL_KEY = 'next-task:brain-model';

export type BrainStatus = 'off' | 'loading' | 'ready' | 'error';

function loadModelPref(): string {
  try {
    return window.localStorage.getItem(MODEL_KEY) ?? DEFAULT_MODEL_ID;
  } catch {
    return DEFAULT_MODEL_ID;
  }
}

/**
 * Manages the optional in-browser LLM behind "give the board a brain". Loads on
 * explicit opt-in (and auto-resumes if previously enabled), tracks download
 * progress, supports switching models, and exposes a guarded `run` that never
 * throws — callers fall back to the rule-based voice on null. `run` streams
 * tokens when given an `onToken`.
 */
export function useBoardBrain(enabled: boolean) {
  const [status, setStatus] = useState<BrainStatus>('off');
  const [progress, setProgress] = useState(0);
  const [model, setModel] = useState<string>(loadModelPref);
  const generateRef = useRef<GenerateFn | null>(null);
  const modelRef = useRef(model);
  const statusRef = useRef(status);
  const autoTried = useRef(false);

  useEffect(() => {
    modelRef.current = model;
  }, [model]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const load = useCallback(async (modelId: string) => {
    setStatus('loading');
    setProgress(0);
    generateRef.current = null;
    try {
      const generate = await loadBrain(modelId, (ratio) => setProgress(ratio));
      generateRef.current = generate;
      setStatus('ready');
      try {
        window.localStorage.setItem(ENABLED_KEY, 'on');
      } catch {
        // ignore storage failures
      }
    } catch {
      setStatus('error');
    }
  }, []);

  const enable = useCallback(() => {
    if (generateRef.current && statusRef.current === 'ready') return;
    void load(modelRef.current);
  }, [load]);

  const disable = useCallback(() => {
    generateRef.current = null;
    setStatus('off');
    setProgress(0);
    try {
      window.localStorage.setItem(ENABLED_KEY, 'off');
    } catch {
      // ignore storage failures
    }
  }, []);

  /** Switch to the next model; reloads on the spot if the brain is active. */
  const cycleModel = useCallback(() => {
    const next = nextModelId(modelRef.current);
    modelRef.current = next;
    setModel(next);
    try {
      window.localStorage.setItem(MODEL_KEY, next);
    } catch {
      // ignore storage failures
    }
    if (statusRef.current === 'ready' || statusRef.current === 'loading') void load(next);
    return modelLabel(next);
  }, [load]);

  /**
   * Tier 1: connect a bigger brain — any OpenAI-compatible endpoint (local Ollama/LM
   * Studio, or a frontier API). The config rides the existing model slot as an opaque
   * id, so switching back to the in-browser model is unchanged. Loads immediately.
   */
  const connectRemote = useCallback(
    (config: RemoteBrainConfig) => {
      const id = encodeRemoteId(config);
      modelRef.current = id;
      setModel(id);
      try {
        window.localStorage.setItem(MODEL_KEY, id);
      } catch {
        // ignore storage failures
      }
      void load(id);
      return modelLabel(id);
    },
    [load],
  );

  // Auto-resume once if the user opted in on a previous visit.
  useEffect(() => {
    if (!enabled || autoTried.current) return;
    autoTried.current = true;
    let opted = false;
    try {
      opted = window.localStorage.getItem(ENABLED_KEY) === 'on';
    } catch {
      opted = false;
    }
    if (!opted) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load(modelRef.current);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, load]);

  const run = useCallback(async (messages: BrainMessage[], onToken?: OnToken): Promise<string | null> => {
    if (!generateRef.current) return null;
    try {
      const output = await generateRef.current(messages, onToken);
      return output || null;
    } catch {
      return null;
    }
  }, []);

  return { status, progress, model, modelName: modelLabel(model), enable, disable, cycleModel, connectRemote, run };
}
