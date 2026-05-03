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
        className="fixed top-6 left-6 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
        aria-label="Open menu"
      >
        <svg
          width="20"
          height="14"
          viewBox="0 0 20 14"
          fill="none"
          className="stroke-current"
        >
          <path d="M0 1h20M0 7h20M0 13h20" strokeWidth="1.5" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.aside
              className="fixed top-0 left-0 z-50 flex h-full w-full max-w-md flex-col border-r border-slate-200 bg-white"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Community</h2>
                  <p className="text-xs text-slate-400">
                    {comments.length} idea{comments.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Close menu"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="stroke-current"
                  >
                    <path d="M1 1l12 12M13 1L1 13" strokeWidth="1.5" />
                  </svg>
                </button>
              </div>

              {/* Comments list */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {comments.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <p className="mb-2 text-sm text-slate-300">
                      No ideas yet
                    </p>
                    <p className="text-xs text-slate-200">
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
              <div className="border-t border-slate-200 px-6 py-4">
                <p className="text-center text-xs text-slate-300">
                  Day 0 · Waiting for ideas...
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
