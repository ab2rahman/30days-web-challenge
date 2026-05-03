"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import MagikarpLanding from "@/components/MagikarpLanding";
import Day1Challenge from "@/components/Day1Challenge";

export default function Home() {
  const [started, setStarted] = useState(false);

  return (
    <AnimatePresence mode="wait">
      {!started ? (
        <motion.div key="landing" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <MagikarpLanding onStart={() => setStarted(true)} />
        </motion.div>
      ) : (
        <motion.div key="challenge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <Day1Challenge onHome={() => setStarted(false)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
