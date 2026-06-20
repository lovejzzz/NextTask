import { motion } from 'framer-motion';
import { useEffect, useMemo } from 'react';

/**
 * Experimental celebration: a one-shot confetti burst rendered as a fixed,
 * non-interactive overlay. Mount it with a unique key to fire; it calls
 * `onDone` after the animation so the parent can unmount it.
 */
const COLORS = ['#6366f1', '#8b5cf6', '#34d399', '#fbbf24', '#f87171', '#38bdf8', '#f472b6'];
const PIECES = 90;
const DURATION_MS = 1900;

type Piece = {
  left: number;
  delay: number;
  duration: number;
  drift: number;
  spin: number;
  size: number;
  color: string;
  radius: string;
};

function buildPieces(): Piece[] {
  return Array.from({ length: PIECES }, (_, i) => {
    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    return {
      left: rand(0, 100),
      delay: rand(0, 0.25),
      duration: rand(1.1, 1.7),
      drift: rand(-140, 140),
      spin: rand(180, 720) * (Math.random() > 0.5 ? 1 : -1),
      size: rand(7, 13),
      color: COLORS[i % COLORS.length],
      radius: Math.random() > 0.5 ? '2px' : '50%',
    };
  });
}

export function Confetti({ onDone }: { onDone: () => void }) {
  // Respect a user's reduced-motion preference: skip the storm, just clear.
  const reduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const pieces = useMemo(() => (reduced ? [] : buildPieces()), [reduced]);

  useEffect(() => {
    const timer = window.setTimeout(onDone, reduced ? 150 : DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [onDone, reduced]);

  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map((piece, index) => (
        <motion.span
          key={index}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size * 1.4,
            background: piece.color,
            borderRadius: piece.radius,
          }}
          initial={{ y: '-10vh', x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '112vh', x: piece.drift, rotate: piece.spin, opacity: [1, 1, 0.9, 0] }}
          transition={{ duration: piece.duration, delay: piece.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}
