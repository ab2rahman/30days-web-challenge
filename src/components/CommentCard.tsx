"use client";

import { motion } from "framer-motion";
import type { Comment } from "@/data/comments";

interface CommentCardProps {
  comment: Comment;
  index: number;
}

export default function CommentCard({ comment, index }: CommentCardProps) {
  const statusColors = {
    pending: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
    building: "bg-blue-400/10 text-blue-400 border-blue-400/20",
    built: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  };

  return (
    <motion.div
      className="rounded-xl border border-white/5 bg-white/[0.03] p-4 transition-all hover:border-white/10 hover:bg-white/[0.06]"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-white/80">
          @{comment.username}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${statusColors[comment.status]}`}
        >
          {comment.status}
        </span>
      </div>
      <p className="mb-3 text-sm leading-relaxed text-white/40">
        {comment.text}
      </p>
      <div className="flex items-center gap-3 text-xs text-white/25">
        <span>Day {comment.day}</span>
        <span className="text-white/10">·</span>
        <span>❤ {comment.likes}</span>
        {comment.feature && (
          <>
            <span className="text-white/10">·</span>
            <span className="text-blue-400/70">{comment.feature}</span>
          </>
        )}
      </div>
    </motion.div>
  );
}
