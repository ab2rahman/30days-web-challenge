"use client";

import { motion } from "framer-motion";
import type { Comment } from "@/data/comments";

interface CommentCardProps {
  comment: Comment;
  index: number;
}

export default function CommentCard({ comment, index }: CommentCardProps) {
  const statusColors = {
    pending: { bg: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "rgba(245,158,11,0.2)" },
    building: { bg: "rgba(0,175,255,0.1)", color: "#00AFFF", border: "rgba(0,175,255,0.2)" },
    built: { bg: "rgba(0,230,118,0.1)", color: "#00E676", border: "rgba(0,230,118,0.2)" },
  };

  const sc = statusColors[comment.status];

  const content = (
    <>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: "#F5F7FA" }}>
          @{comment.username}
        </span>
        <span
          className="rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
          style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}
        >
          {comment.status}
        </span>
      </div>
      <p className="mb-3 text-sm leading-relaxed" style={{ color: "#9AA4B2" }}>
        {comment.text}
      </p>
      <div className="flex items-center gap-3 text-xs" style={{ color: "rgba(154,164,178,0.5)" }}>
        <span>Day {comment.day}</span>
        <span style={{ color: "rgba(0,175,255,0.2)" }}>·</span>
        <span>❤ {comment.likes}</span>
        {comment.feature && (
          <>
            <span style={{ color: "rgba(0,175,255,0.2)" }}>·</span>
            <span style={{ color: "rgba(0,175,255,0.7)" }}>{comment.feature}</span>
          </>
        )}
        {comment.url && (
          <>
            <span style={{ color: "rgba(0,175,255,0.2)" }}>·</span>
            <span style={{ color: "rgba(108,92,231,0.7)" }}>View on Instagram</span>
          </>
        )}
      </div>
    </>
  );

  const card = (
    <motion.div
      className="rounded-xl border p-4 transition-all"
      style={{
        background: "rgba(0,175,255,0.03)",
        borderColor: "rgba(0,175,255,0.08)",
      }}
      whileHover={{
        borderColor: "rgba(0,175,255,0.15)",
        background: "rgba(0,175,255,0.06)",
      }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      {content}
    </motion.div>
  );

  if (comment.url) {
    return (
      <a href={comment.url} target="_blank" rel="noopener noreferrer">
        {card}
      </a>
    );
  }

  return card;
}
