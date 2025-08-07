'use client';

import { motion } from 'framer-motion';

interface AnimatedGreetingProps {
  text: string;
}

/**
 * 한 글자씩 staggerChildren 방식을 이용해
 * opacity를 0→1 로 애니메이션합니다.
 */
export default function AnimatedGreeting({ text }: AnimatedGreetingProps) {
  const letters = Array.from(text);

  const container = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.3, // 글자당 0.3초씩 지연
      },
    },
  };

  const child = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <motion.h1
      variants={container}
      initial="hidden"
      animate="visible"
      className="text-2xl font-semibold mb-4"
    >
      {letters.map((char, i) => (
        <motion.span key={i} variants={child}>
          {char}
        </motion.span>
      ))}
    </motion.h1>
  );
}
