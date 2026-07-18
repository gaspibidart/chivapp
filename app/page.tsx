"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Radio, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-[#0a0a0f] px-6 py-16">
      <div className="grid w-full max-w-2xl grid-cols-1 gap-5 md:grid-cols-2">
        <Link href="/chivos" className="group">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex h-56 flex-col justify-between rounded-[28px] border border-white/10 bg-gradient-to-br from-emerald-500/10 to-white/5 p-7 transition group-hover:border-emerald-500/40"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15">
              <Sparkles className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Chivos</h2>
              <p className="mt-1 text-sm text-white/40">Gestión de campañas</p>
            </div>
          </motion.div>
        </Link>

        <Link href="/luzu" className="group">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex h-56 flex-col justify-between rounded-[28px] border border-white/10 bg-gradient-to-br from-sky-500/10 to-white/5 p-7 transition group-hover:border-sky-500/40"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15">
              <Radio className="h-6 w-6 text-sky-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">LUZU</h2>
              <p className="mt-1 text-sm text-white/40">Gestión de eventos y TX</p>
            </div>
          </motion.div>
        </Link>
      </div>
    </main>
  );
}
