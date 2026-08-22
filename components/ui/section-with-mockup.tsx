"use client";

import React from "react";
import { motion, type Variants } from "framer-motion";

interface SectionWithMockupProps {
  title: string | React.ReactNode;
  description: string | React.ReactNode;
  primaryImageSrc: string;
  secondaryImageSrc: string;
  reverseLayout?: boolean;
  className?: string;
}

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.16,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.72, ease: "easeOut" },
  },
};

export default function SectionWithMockup({
  title,
  description,
  primaryImageSrc,
  secondaryImageSrc,
  reverseLayout = false,
  className = "",
}: SectionWithMockupProps) {
  const layoutClasses = reverseLayout
    ? "md:grid-cols-2 md:grid-flow-col-dense"
    : "md:grid-cols-2";
  const textOrderClass = reverseLayout ? "md:col-start-2" : "";
  const imageOrderClass = reverseLayout ? "md:col-start-1" : "";

  return (
    <section
      className={`relative overflow-hidden rounded-[18px] border border-white/[0.075] bg-black py-16 shadow-[0_24px_70px_rgba(0,0,0,.45)] md:py-24 ${className}`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(760px 420px at 16% 2%, rgba(183,205,224,.18), transparent 62%), radial-gradient(660px 390px at 90% 88%, rgba(0,140,255,.18), transparent 66%), linear-gradient(135deg, #020407 0%, #08111c 46%, #000 100%)",
        }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute inset-y-0 left-[-28%] w-[52%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.10),transparent)]"
        initial={{ x: "-20%", opacity: 0 }}
        whileInView={{ x: "210%", opacity: [0, 0.22, 0] }}
        transition={{ duration: 4.8, ease: "easeInOut" }}
        viewport={{ once: true, amount: 0.25 }}
      />

      <div className="container relative z-10 mx-auto w-full max-w-[1220px] px-6 md:px-10">
        <motion.div
          className={`grid w-full grid-cols-1 items-center gap-14 md:gap-10 ${layoutClasses}`}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div
            className={`mx-auto flex max-w-[560px] flex-col items-start gap-5 md:mx-0 ${textOrderClass}`}
            variants={itemVariants}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-white/[0.035] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-100/70">
              LumenAI OS
            </div>
            <h2 className="max-w-[560px] text-4xl font-semibold leading-[1.04] tracking-[-0.045em] text-white md:text-[48px]">
              {title}
            </h2>
            <div className="max-w-[560px] text-sm leading-7 text-[#8f98a3] md:text-[15px]">
              {description}
            </div>
          </motion.div>

          <motion.div
            className={`relative mx-auto mt-4 w-full max-w-[320px] md:mt-0 md:max-w-[470px] ${imageOrderClass}`}
            variants={itemVariants}
          >
            <motion.div
              className="absolute z-0 h-[320px] w-[300px] rounded-[30px] border border-white/[0.06] bg-[#090909] opacity-70 blur-[1px] md:h-[500px] md:w-[472px]"
              style={{
                top: reverseLayout ? "auto" : "8%",
                bottom: reverseLayout ? "8%" : "auto",
                left: reverseLayout ? "auto" : "-18%",
                right: reverseLayout ? "-18%" : "auto",
              }}
              initial={{ y: 0 }}
              whileInView={{ y: reverseLayout ? -18 : -28 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              viewport={{ once: true, amount: 0.5 }}
            >
              <div
                className="h-full w-full rounded-[30px] bg-cover bg-center"
                style={{
                  backgroundImage: `url(${secondaryImageSrc})`,
                }}
              />
            </motion.div>

            <motion.div
              className="relative z-10 h-[410px] w-full overflow-hidden rounded-[30px] border border-white/[0.08] bg-white/[0.045] shadow-[0_30px_90px_rgba(0,0,0,.52)] backdrop-blur-[16px] md:h-[620px]"
              initial={{ y: 0 }}
              whileInView={{ y: reverseLayout ? 18 : 28 }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.08 }}
              viewport={{ once: true, amount: 0.5 }}
            >
              <div
                className="h-full w-full bg-cover bg-center"
                style={{
                  backgroundImage: `url(${primaryImageSrc})`,
                }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.06),transparent_36%,rgba(0,0,0,.18))]" />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <div
        className="absolute bottom-0 left-0 z-0 h-px w-full"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 100%)",
        }}
      />
    </section>
  );
}
