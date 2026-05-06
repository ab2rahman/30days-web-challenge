"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import MagikarpLanding from "@/components/MagikarpLanding";

const Day1Challenge = dynamic(() => import("@/components/Day1Challenge"), {
  loading: () => (
    <div className="flex items-center justify-center h-screen" style={{ background: "#050B18" }}>
      <div style={{ color: "#00AFFF", fontSize: 14, fontFamily: "var(--font-geist-mono)" }}>Loading...</div>
    </div>
  ),
});

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
