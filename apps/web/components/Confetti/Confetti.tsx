'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ConfettiPiece = {
  id: number;
  x: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
};

type ConfettiProps = {
  isActive: boolean;
  onComplete?: () => void;
  duration?: number;
  pieceCount?: number;
};

// Kid-friendly crayon colors for confetti
const CONFETTI_COLORS = [
  'hsl(12, 75%, 58%)', // Coral orange
  'hsl(355, 65%, 72%)', // Blush pink
  'hsl(42, 95%, 62%)', // Sunshine yellow
  'hsl(85, 35%, 52%)', // Sage green
  'hsl(340, 30%, 65%)', // Dusty rose/purple
  'hsl(25, 80%, 72%)', // Peach
];

// Confetti shapes: circles, squares, and stars
const shapes = ['circle', 'square', 'star'] as const;

const StarShape = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const ConfettiPieceComponent = ({
  piece,
  duration,
}: {
  piece: ConfettiPiece;
  duration: number;
}) => {
  const shape = shapes[piece.id % shapes.length];
  const endY = typeof window !== 'undefined' ? window.innerHeight + 100 : 800;

  return (
    <motion.div
      initial={{
        x: piece.x,
        y: -20,
        rotate: 0,
        opacity: 1,
        scale: 0,
      }}
      animate={{
        y: endY,
        rotate: piece.rotation + 720,
        opacity: [1, 1, 1, 0],
        scale: [0, 1, 1, 0.5],
        x: piece.x + (Math.random() - 0.5) * 200,
      }}
      transition={{
        duration: duration / 1000,
        delay: piece.delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="fixed pointer-events-none z-50"
      style={{ top: 0, left: 0 }}
    >
      {shape === 'circle' && (
        <div
          className="rounded-full"
          style={{
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
          }}
        />
      )}
      {shape === 'square' && (
        <div
          className="rounded-sm"
          style={{
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
          }}
        />
      )}
      {shape === 'star' && <StarShape color={piece.color} size={piece.size} />}
    </motion.div>
  );
};

const Confetti = ({
  isActive,
  onComplete,
  duration = 3000,
  pieceCount = 50,
}: ConfettiProps) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  const generatePieces = useCallback(() => {
    const windowWidth =
      typeof window !== 'undefined' ? window.innerWidth : 1000;

    return Array.from({ length: pieceCount }, (_, i) => ({
      id: i,
      x: Math.random() * windowWidth,
      color:
        CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.random() * 12 + 8, // 8-20px
      rotation: Math.random() * 360,
      delay: Math.random() * 0.5, // Stagger the start
    }));
  }, [pieceCount]);

  useEffect(() => {
    if (isActive) {
      setPieces(generatePieces());

      // Call onComplete after animation finishes
      const timer = setTimeout(() => {
        onComplete?.();
        setPieces([]);
      }, duration + 500); // Extra buffer for last pieces

      return () => clearTimeout(timer);
    } else {
      setPieces([]);
    }
  }, [isActive, duration, onComplete, generatePieces]);

  return (
    <AnimatePresence>
      {pieces.map((piece) => (
        <ConfettiPieceComponent
          key={piece.id}
          piece={piece}
          duration={duration}
        />
      ))}
    </AnimatePresence>
  );
};

export default Confetti;
