import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import type { Mood } from '../../lib/companion';
import type { BrainContext } from '../../lib/companionBrain';
import { cx } from '../../lib/utils';
import type { BrainStatus } from '../../hooks/useBoardBrain';

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
 * mind. When the optional in-browser brain is loaded, its lines become
 * generative; otherwise it speaks the deterministic `quip`. Poking it asks for
 * a fresh line.
 */
export function BoardCompanion({
  mood,
  quip,
  onPoke,
  pokeNonce = 0,
  brainStatus = 'off',
  brainProgress = 0,
  generate,
  context,
}: {
  mood: Mood;
  quip: string;
  onPoke: () => void;
  pokeNonce?: number;
  brainStatus?: BrainStatus;
  brainProgress?: number;
  generate?: (mood: Mood, context: BrainContext) => Promise<string | null>;
  context?: BrainContext;
}) {
  const face = MOOD_FACE[mood];
  const asleep = mood === 'neglected';

  const [aiLine, setAiLine] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const contextRef = useRef(context);
  useEffect(() => {
    contextRef.current = context;
  });

  // Ask the brain for a fresh line whenever the mood shifts or it's poked.
  useEffect(() => {
    if (brainStatus !== 'ready' || !generate) return;
    let cancelled = false;
    const run = async () => {
      setThinking(true);
      const ctx = contextRef.current;
      const line = ctx ? await generate(mood, ctx) : null;
      if (cancelled) return;
      if (line) setAiLine(line);
      setThinking(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [mood, pokeNonce, brainStatus, generate]);

  const line = brainStatus === 'ready' ? aiLine ?? quip : quip;

  return (
    <motion.div
      className="companion"
      aria-label="The board has feelings (experimental)"
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
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

      {brainStatus === 'loading' ? (
        <div className="companion-loading" role="status">
          🧠 waking up… {Math.round(brainProgress * 100)}%
          <span className="companion-loading-track">
            <span className="companion-loading-fill" style={{ width: `${Math.round(brainProgress * 100)}%` }} />
          </span>
        </div>
      ) : null}

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
    </motion.div>
  );
}
