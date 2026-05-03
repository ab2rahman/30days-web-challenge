"use client";

import { motion } from "framer-motion";
import DayCounter from "@/components/DayCounter";

export default function Home() {
  return (
    <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden">
      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-accent/5 blur-[128px]" />
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-slate-200/40 blur-[128px]" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        <DayCounter current={0} total={30} />

        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <p className="text-lg font-light tracking-wide text-slate-400">
            The challenge hasn&apos;t started yet
          </p>

          <motion.a
            href="https://www.youtube.com/@abduarrahmanscode"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 rounded-full border border-accent/30 bg-accent/5 px-6 py-2.5 text-sm font-medium text-accent transition-colors hover:border-accent/50 hover:bg-accent/10"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Comment your idea on the reel
          </motion.a>
        </motion.div>
      </div>

      {/* Bottom label */}
      <motion.div
        className="absolute bottom-8 text-xs tracking-widest text-slate-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
      >
        30 DAYS WEB CHALLENGE
      </motion.div>
    </div>
  );
}
