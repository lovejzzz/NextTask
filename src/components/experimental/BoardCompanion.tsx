import { AnimatePresence, motion } from 'framer-motion';

import type { Mood } from '../../lib/companion';
import { cx } from '../../lib/utils';

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
 * The board's face. A small CSS creature in the corner that emotes per mood and
 * speaks its mind. Poking it coughs up a fresh line.
 */
export function BoardCompanion({ mood, quip, onPoke }: { mood: Mood; quip: string; onPoke: () => void }) {
  const face = MOOD_FACE[mood];
  const asleep = mood === 'neglected';

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
          key={quip}
          className="companion-bubble"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          <span className="companion-mood">{mood}</span>
          {quip}
        </motion.div>
      </AnimatePresence>

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
