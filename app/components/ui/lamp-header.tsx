"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function LampHeader({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl",
        className
      )}
    >
      <div className="relative flex items-center justify-center px-6 py-10 md:py-12">
        {/* Lamps */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-120px] h-[320px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="absolute left-1/2 top-[-85px] h-[220px] w-[420px] -translate-x-1/2 rounded-full bg-cyan-400/18 blur-2xl" />
          <div className="absolute left-1/2 top-[-10px] h-[1px] w-[520px] -translate-x-1/2 bg-cyan-300/35" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/35" />
        </div>

        <div className="relative z-10 text-center">
          <motion.h1
            initial={{ opacity: 0.5, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="bg-gradient-to-br from-slate-100 to-slate-400 bg-clip-text text-3xl font-semibold tracking-tight text-transparent md:text-5xl"
          >
            {title}
          </motion.h1>

          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.08 }}
              className="mx-auto mt-3 max-w-3xl text-sm text-white/70 md:text-base"
            >
              {subtitle}
            </motion.p>
          ) : null}
        </div>
      </div>
    </div>
  );
}