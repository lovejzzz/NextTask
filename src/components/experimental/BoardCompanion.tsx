import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { Mood } from '../../lib/companion';
import type { ChatTurn } from '../../lib/companionBrain';
import { cx } from '../../lib/utils';
import type { BrainStatus } from '../../hooks/useBoardBrain';
import { CompanionChat, type ChatReply } from './CompanionChat';

type MouthShape = 'flat' | 'smile' | 'frown' | 'open' | 'wavy';
type Face = { eyes: string; mouth: MouthShape };

// Eyes are font-safe glyphs; mouths are CSS shapes (see globals.css).
const MOOD_FACE: Record<Mood, Face> = {
  proud: { eyes: '^ ^', mouth: 'smile' },
  thriving: { eyes: '• •', mouth: 'smile' },
  content: { eyes: '• •', mouth: 'flat' },
  restless: { eyes: '• •', mouth: 'wavy' },
  overwhelmed: { eyes: 'O O', mouth: 'open' },
  anxious: { eyes: 'O O', mouth: 'frown' },
  exasperated: { eyes: '– –', mouth: 'flat' },
  bored: { eyes: '– –', mouth: 'flat' },
  neglected: { eyes: '— —', mouth: 'flat' },
};

/**
 * The board's face. A small CSS creature that emotes per mood and speaks its
 * mind. When the optional in-browser brain is loaded its lines become
 * generative (`generate`) and you can open a chat with it (`chat`); otherwise it
 * speaks the deterministic `quip`. Poking it asks for a fresh line.
 */
export function BoardCompanion({
  mood,
  quip,
  onPoke,
  pokeNonce = 0,
  brainStatus = 'off',
  brainProgress = 0,
  generate,
  chat,
  flash,
  goalProgress = 0,
  goalMet = false,
}: {
  mood: Mood;
  quip: string;
  onPoke: () => void;
  pokeNonce?: number;
  brainStatus?: BrainStatus;
  brainProgress?: number;
  generate?: (mood: Mood) => Promise<string | null>;
  chat?: (history: ChatTurn[], onToken: (chunk: string) => void) => Promise<ChatReply>;
  flash?: { text: string; nonce: number };
  goalProgress?: number;
  goalMet?: boolean;
}) {
  const face = MOOD_FACE[mood];
  const asleep = mood === 'neglected';

  const [aiLine, setAiLine] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [flashText, setFlashText] = useState<string | null>(null);

  // A proactive reaction (ship, milestone, new task) briefly takes over the bubble.
  useEffect(() => {
    if (!flash || !flash.nonce) return;
    let cancelled = false;
    let timer = 0;
    queueMicrotask(() => {
      if (cancelled) return;
      setFlashText(flash.text);
      timer = window.setTimeout(() => setFlashText(null), 5000);
    });
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [flash]);

  // Ask the brain for a fresh line whenever the mood shifts or it's poked.
  useEffect(() => {
    if (brainStatus !== 'ready' || !generate) return;
    let cancelled = false;
    const run = async () => {
      setThinking(true);
      const out = await generate(mood);
      if (cancelled) return;
      if (out) setAiLine(out);
      setThinking(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [mood, pokeNonce, brainStatus, generate]);

  const baseLine = brainStatus === 'ready' ? aiLine ?? quip : quip;
  const line = flashText ?? baseLine;
  const canChat = brainStatus === 'ready' && Boolean(chat);

  return (
    <motion.div
      className="companion"
      aria-label="The board has feelings (experimental)"
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      <AnimatePresence>{chatOpen && chat ? <CompanionChat chat={chat} onClose={() => setChatOpen(false)} /> : null}</AnimatePresence>

      {/* Stable live region so screen readers announce the board's lines as they change. */}
      <div className="companion-live" role="status" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.div
            key={line}
            className="companion-bubble"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <span className="companion-mood">
              {mood}
              {brainStatus === 'ready' ? (
                <span className="companion-brain-tag" title="In-browser LLM active">
                  {thinking ? 'thinking…' : '🧠'}
                </span>
              ) : null}
            </span>
            {line}
          </motion.div>
        </AnimatePresence>
      </div>

      {brainStatus === 'loading' ? (
        <div className="companion-loading" role="status">
          🧠 waking up… {Math.round(brainProgress * 100)}%
          <span className="companion-loading-track">
            <span className="companion-loading-fill" style={{ width: `${Math.round(brainProgress * 100)}%` }} />
          </span>
        </div>
      ) : null}

      <div className="companion-row">
        <div
          className={cx('companion-ring', goalMet && 'is-met')}
          style={{ ['--ring-deg' as string]: `${Math.round(goalProgress * 360)}deg` }}
          title={goalMet ? 'Daily goal met!' : `Daily goal: ${Math.round(goalProgress * 100)}%`}
        >
          <button
            type="button"
            className={cx('companion-creature', asleep && 'is-asleep')}
            onClick={onPoke}
            aria-label={`The board feels ${mood}. Poke it.`}
            title="Poke the board"
          >
            <span className="companion-eyes">{face.eyes}</span>
            <span className={cx('companion-mouth', `is-${face.mouth}`)} />
            {asleep ? <span className="companion-zzz">z</span> : null}
          </button>
        </div>

        {canChat ? (
          <button
            type="button"
            className={cx('companion-talk', chatOpen && 'is-open')}
            onClick={() => setChatOpen((value) => !value)}
            aria-label="Talk to the board"
            title="Talk to the board"
          >
            <MessageCircle size={15} />
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}
