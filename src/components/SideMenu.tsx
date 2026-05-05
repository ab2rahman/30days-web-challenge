"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { comments } from "@/data/comments";
import CommentCard from "./CommentCard";

export default function SideMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-5 left-5 z-40 flex h-10 w-10 items-center justify-center rounded-xl border transition-all backdrop-blur-md"
        style={{
          borderColor: "rgba(0,175,255,0.15)",
          background: "rgba(0,175,255,0.05)",
          color: "rgba(0,175,255,0.6)",
          boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
        }}
        aria-label="Open menu"
      >
        <svg
          width="18"
          height="12"
          viewBox="0 0 18 12"
          fill="none"
          className="stroke-current"
        >
          <path d="M0 1h18M0 6h18M0 11h18" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 backdrop-blur-md"
              style={{ background: "rgba(5,11,24,0.7)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.aside
              className="fixed top-0 left-0 z-50 flex h-full w-full max-w-sm flex-col border-r backdrop-blur-xl"
              style={{ background: "rgba(5,11,24,0.95)", borderColor: "rgba(0,175,255,0.1)" }}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b px-6 py-5" style={{ borderColor: "rgba(0,175,255,0.08)" }}>
                <div>
                  <h2 className="text-lg font-bold text-white">Instagram</h2>
                  <p className="text-xs" style={{ color: "#9AA4B2" }}>
                    {comments.length} idea{comments.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-all hover:bg-white/5 hover:text-white/70"
                  aria-label="Close menu"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="stroke-current"
                  >
                    <path d="M1 1l12 12M13 1L1 13" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Comments list */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {comments.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <p className="mb-2 text-sm" style={{ color: "rgba(0,175,255,0.3)" }}>
                      No ideas yet
                    </p>
                    <p className="text-xs" style={{ color: "rgba(0,175,255,0.15)" }}>
                      Comment your idea on the reel!
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {comments.map((comment, i) => (
                      <CommentCard
                        key={comment.id}
                        comment={comment}
                        index={i}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t px-6 py-4" style={{ borderColor: "rgba(0,175,255,0.08)" }}>
                <p className="text-center text-xs" style={{ color: "#9AA4B2" }}>
                  Day 2 · Donut Math Edition
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
