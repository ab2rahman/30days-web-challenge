"use client";

import { motion } from "framer-motion";

interface DayCounterProps {
  current: number;
  total: number;
}

export default function DayCounter({ current, total }: DayCounterProps) {
  const currentStr = String(current).padStart(2, "0");
  const totalStr = String(total).padStart(2, "0");

  return (
    <motion.div
      className="flex items-center gap-4 select-none"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <motion.span
        className="text-8xl font-bold tracking-tighter text-slate-900 md:text-[10rem]"
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {currentStr}
      </motion.span>

      <motion.span
        className="text-4xl font-light text-slate-300 md:text-6xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        /
      </motion.span>

      <motion.span
        className="text-8xl font-bold tracking-tighter text-slate-200 md:text-[10rem]"
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        {totalStr}
      </motion.span>
    </motion.div>
  );
}
