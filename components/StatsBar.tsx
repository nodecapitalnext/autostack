"use client";

interface StatsBarProps {
  totalPositions: bigint;
  totalVolumeUSDC: bigint;
  totalFees: bigint;
  activeUsers: bigint;
}

function fmt(val: bigint, decimals = 6) {
  const n = Number(val) / 10 ** decimals;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function StatsBar({ totalPositions, totalVolumeUSDC, totalFees, activeUsers }: StatsBarProps) {
  const stats = [
    {
      label: "Total Positions",
      value: totalPositions.toString(),
      icon: "📊",
      color: "text-blue-400",
    },
    {
      label: "Total Volume",
      value: fmt(totalVolumeUSDC),
      icon: "💰",
      color: "text-green-400",
    },
    {
      label: "Fees Collected",
      value: fmt(totalFees),
      icon: "⚡",
      color: "text-purple-400",
    },
    {
      label: "Active Users",
      value: activeUsers.toString(),
      icon: "👥",
      color: "text-cyan-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="stat-card flex flex-col gap-1 hover:border-white/15 transition-colors">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </div>
          <div className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}
