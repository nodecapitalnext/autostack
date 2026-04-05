"use client";
import { useEffect, useState } from "react";

export function CountdownTimer({ nextExecution }: { nextExecution: bigint }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calc = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = Number(nextExecution) - now;
      setRemaining(Math.max(0, diff));
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [nextExecution]);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  const total = Number(nextExecution) - Math.floor(Date.now() / 1000 - remaining);
  const pct = total > 0 ? Math.max(0, Math.min(100, (1 - remaining / total) * 100)) : 100;

  if (remaining === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 font-semibold text-sm">Ready to execute</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: "100%", background: "linear-gradient(90deg,#10B981,#34D399)" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">Next execution in</span>
        <div className="flex items-center gap-1 font-mono text-sm font-bold text-blue-300">
          <span className="glass px-2 py-0.5 rounded-lg text-xs">{pad(h)}h</span>
          <span className="text-slate-500">:</span>
          <span className="glass px-2 py-0.5 rounded-lg text-xs">{pad(m)}m</span>
          <span className="text-slate-500">:</span>
          <span className="glass px-2 py-0.5 rounded-lg text-xs">{pad(s)}s</span>
        </div>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
