"use client";

import { motion } from "framer-motion";
import type { Comment } from "@/data/comments";

interface CommentCardProps {
  comment: Comment;
  index: number;
}

export default function CommentCard({ comment, index }: CommentCardProps) {
  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-600",
    building: "bg-accent/10 text-accent",
    built: "bg-success/10 text-success",
  };

  return (
    <motion.div
      className="rounded-lg border border-slate-100 bg-slate-50 p-4 transition-colors hover:border-slate-200 hover:bg-slate-100"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900">
          @{comment.username}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[comment.status]}`}
        >
          {comment.status}
        </span>
      </div>
      <p className="mb-2 text-sm leading-relaxed text-slate-500">
        {comment.text}
      </p>
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span>Day {comment.day}</span>
        <span>·</span>
        <span>❤ {comment.likes}</span>
        {comment.feature && (
          <>
            <span>·</span>
            <span className="text-accent">{comment.feature}</span>
          </>
        )}
      </div>
    </motion.div>
  );
}
