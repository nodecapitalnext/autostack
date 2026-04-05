"use client";
import { useState, useEffect, useRef } from "react";
import {
  useAccount, useConnect, useDisconnect,
  useReadContract, useWriteContract, useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { baseSepolia } from "wagmi/chains";
import {
  AUTOSTACK_ADDRESS, AUTOSTACK_ABI, USDC_ADDRESS, ERC20_ABI, INTERVALS,
} from "@/lib/config";
import { CountdownTimer } from "@/components/CountdownTimer";

const u6 = (n: string) => parseUnits(n || "0", 6);
const f6 = (n: bigint) => parseFloat(formatUnits(n, 6)).toFixed(2);
const fEth = (n: bigint) => parseFloat(formatUnits(n, 18)).toFixed(6);
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

type Tab = "overview" | "create" | "deposit" | "withdraw";

const TICKER_ITEMS = [
  "⚡ AutoStack — DCA on Base",
  "🔵 Base Sepolia Testnet",
  "💎 Stack ETH automatically",
  "🔄 Set it & forget it",
  "📈 Dollar Cost Averaging",
  "🛡 Non-custodial protocol",
  "⚡ AutoStack — DCA on Base",
  "🔵 Base Sepolia Testnet",
  "💎 Stack ETH automatically",
  "🔄 Set it & forget it",
  "📈 Dollar Cost Averaging",
  "🛡 Non-custodial protocol",
];

// ── Wallet Modal ──────────────────────────────────────────────────────────────
function WalletModal({ onClose }: { onClose: () => void }) {
  const { connectors, connect } = useConnect();
  const icons: Record<string, string> = {
    "Coinbase Wallet": "🔵",
    "WalletConnect": "🔗",
    "Injected": "🦊",
    "MetaMask": "🦊",
    "Phantom": "👻",
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative glass-strong p-6 w-full max-w-sm anim-fade-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="font-bold text-base text-white">Connect Wallet</div>
            <div className="text-xs text-slate-500 mt-0.5">Choose your preferred wallet</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg glass-md flex items-center justify-center text-slate-400 hover:text-white transition-colors">✕</button>
        </div>
        <div className="flex flex-col gap-2">
          {connectors.map((c) => (
            <button key={c.id}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-white/7 bg-white/3 hover:bg-white/7 hover:border-white/14 transition-all text-left group"
              onClick={() => { connect({ connector: c }); onClose(); }}>
              <span className="text-2xl">{icons[c.name] ?? "💼"}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">{c.name}</div>
                <div className="text-xs text-slate-500">Connect with {c.name}</div>
              </div>
              <span className="text-slate-600 group-hover:text-slate-400 transition-colors text-sm">→</span>
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-slate-600 mt-4">By connecting, you agree to the protocol terms</p>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: "ok" | "err" | "info" }) {
  const colors = {
    ok:   "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    err:  "border-red-500/30 bg-red-500/10 text-red-300",
    info: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  };
  const icons = { ok: "✓", err: "✕", info: "ℹ" };
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl anim-fade-up text-sm font-medium ${colors[type]}`}>
      <span className="text-base">{icons[type]}</span>
      {msg}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: string; color: string }) {
  return (
    <div className="stat-card flex flex-col gap-2 group cursor-default">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className={`text-2xl font-bold font-mono tracking-tight ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-600">{sub}</div>}
    </div>
  );
}

// ── Protocol Stats ────────────────────────────────────────────────────────────
function ProtocolStats({ stats }: { stats: readonly [bigint, bigint, bigint, bigint] | undefined }) {
  const s = stats ?? [0n, 0n, 0n, 0n];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard label="Total Positions" value={s[0].toString()} icon="📊" color="text-blue-400" sub="All time" />
      <StatCard label="Total Volume" value={`$${f6(s[1])}`} icon="💰" color="text-emerald-400" sub="USDC processed" />
      <StatCard label="Fees Collected" value={`$${f6(s[2])}`} icon="⚡" color="text-purple-400" sub="Protocol revenue" />
      <StatCard label="Active Users" value={s[3].toString()} icon="👥" color="text-cyan-400" sub="Live positions" />
    </div>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: "01", title: "Deposit USDC", desc: "Fund your vault with USDC. Stays non-custodial — only you can withdraw.", icon: "💰", color: "from-blue-500 to-blue-700" },
    { n: "02", title: "Set Schedule", desc: "Choose amount per run, frequency (daily/weekly/monthly), and number of runs.", icon: "⏱", color: "from-purple-500 to-purple-700" },
    { n: "03", title: "Auto-Execute", desc: "Protocol swaps USDC → ETH on schedule. ETH accumulates in your position.", icon: "🔄", color: "from-emerald-500 to-emerald-700" },
    { n: "04", title: "Stack & Profit", desc: "Watch your ETH grow over time. Pause, resume, or close anytime.", icon: "📈", color: "from-cyan-500 to-cyan-700" },
  ];
  return (
    <div className="glass p-6 rounded-2xl flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-500 to-purple-500" />
        <h2 className="font-bold text-base text-white">How It Works</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((s) => (
          <div key={s.n} className="glass-md p-4 flex flex-col gap-3 hover:border-white/15 transition-all group">
            <div className="flex items-center justify-between">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-lg shadow-lg group-hover:scale-110 transition-transform`}>
                {s.icon}
              </div>
              <span className="text-xs font-mono text-slate-600 font-bold">{s.n}</span>
            </div>
            <div>
              <div className="font-semibold text-sm text-white mb-1">{s.title}</div>
              <div className="text-xs text-slate-500 leading-relaxed">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Position Panel ────────────────────────────────────────────────────────────
function PositionPanel({
  pos, canExec, busy,
  onExecute, onPause, onResume, onClose,
}: {
  pos: any; canExec: boolean | undefined; busy: boolean;
  onExecute: () => void; onPause: () => void; onResume: () => void; onClose: () => void;
}) {
  const progress = pos.runsCompleted > 0n
    ? Number((pos.runsCompleted * 100n) / (pos.runsCompleted + pos.runsRemaining))
    : 0;

  return (
    <div className="glass-strong p-6 rounded-2xl flex flex-col gap-5 anim-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl shadow-lg">
            ⚡
          </div>
          <div>
            <div className="font-bold text-white">DCA Position</div>
            <div className="text-xs text-slate-500">AutoStack Protocol</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pos.paused
            ? <span className="badge badge-gray">⏸ Paused</span>
            : <span className="badge badge-green" style={{ animation: "pulse-ring 2s ease-out infinite" }}>● Active</span>
          }
        </div>
      </div>

      <div className="divider" />

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Per Run",        value: `$${f6(pos.amountPerRun)}`,                  icon: "💵", color: "text-blue-300" },
          { label: "Runs Remaining", value: pos.runsRemaining.toString(),                 icon: "🔢", color: "text-purple-300" },
          { label: "Runs Completed", value: pos.runsCompleted.toString(),                 icon: "✅", color: "text-emerald-300" },
          { label: "Total Spent",    value: `$${f6(pos.totalSpent)}`,                     icon: "💸", color: "text-yellow-300" },
          { label: "ETH Stacked",    value: `${fEth(pos.ethAccumulated)} ETH`,            icon: "🔷", color: "text-cyan-300" },
          { label: "Total Deposited",value: `$${f6(pos.totalDeposited)}`,                 icon: "🏦", color: "text-slate-300" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">{s.icon}</span>
              <span className="text-xs text-slate-500 font-medium">{s.label}</span>
            </div>
            <div className={`font-bold font-mono text-lg ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Execution progress</span>
          <span className="text-slate-400 font-mono">{progress}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-xs text-slate-600">
          <span>{pos.runsCompleted.toString()} runs done</span>
          <span>{pos.runsRemaining.toString()} remaining</span>
        </div>
      </div>

      {/* Countdown */}
      {pos.nextExecution > 0n && (
        <div className="glass-md p-4 rounded-xl">
          <CountdownTimer nextExecution={pos.nextExecution} />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        {canExec && (
          <button className="btn btn-success" onClick={onExecute} disabled={busy}>
            {busy ? <span className="anim-spin-slow inline-block">⟳</span> : "▶"} Execute Now
          </button>
        )}
        {pos.paused
          ? <button className="btn btn-ghost" onClick={onResume} disabled={busy}>▶ Resume</button>
          : <button className="btn btn-ghost" onClick={onPause} disabled={busy}>⏸ Pause</button>
        }
        <button className="btn btn-danger ml-auto" onClick={onClose} disabled={busy}>✕ Close Position</button>
      </div>
    </div>
  );
}

// ── Create Form ───────────────────────────────────────────────────────────────
function CreateForm({
  amtPerRun, setAmtPerRun, intervalIdx, setIntervalIdx, runs, setRuns, busy, onCreate,
}: {
  amtPerRun: string; setAmtPerRun: (v: string) => void;
  intervalIdx: number; setIntervalIdx: (i: number) => void;
  runs: string; setRuns: (v: string) => void;
  busy: boolean; onCreate: () => void;
}) {
  const total = (parseFloat(amtPerRun || "0") * parseInt(runs || "0")).toFixed(2);
  const valid = parseFloat(amtPerRun) > 0 && parseInt(runs) > 0;

  return (
    <div className="glass-strong p-6 rounded-2xl flex flex-col gap-5 anim-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-xl shadow-lg">✨</div>
        <div>
          <div className="font-bold text-white">Create DCA Position</div>
          <div className="text-xs text-slate-500">Configure your automated buy schedule</div>
        </div>
      </div>

      <div className="divider" />

      {/* Amount per run */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">USDC per execution</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
          <input className="input pl-8 text-lg font-mono" type="number" min="1" step="1"
            placeholder="10.00" value={amtPerRun} onChange={e => setAmtPerRun(e.target.value)} />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">USDC</span>
        </div>
      </div>

      {/* Frequency */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Frequency</label>
        <div className="grid grid-cols-3 gap-2">
          {INTERVALS.map((iv, i) => (
            <button key={iv.label} onClick={() => setIntervalIdx(i)}
              className={`p-3.5 rounded-xl text-sm font-semibold transition-all border flex flex-col items-center gap-1
                ${intervalIdx === i ? "tab-active" : "tab-inactive glass-md"}`}>
              <span className="text-lg">{i === 0 ? "📅" : i === 1 ? "📆" : "🗓"}</span>
              <span>{iv.label}</span>
              <span className="text-xs font-normal opacity-60">{iv.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Runs */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Number of executions</label>
        <input className="input text-lg font-mono" type="number" min="1" max="365"
          placeholder="10" value={runs} onChange={e => setRuns(e.target.value)} />
      </div>

      {/* Summary */}
      {valid && (
        <div className="glass-md p-4 rounded-xl flex items-center justify-between anim-fade-in">
          <div className="text-xs text-slate-400">Total commitment</div>
          <div className="font-bold text-white font-mono">${total} <span className="text-slate-500 font-normal text-xs">USDC</span></div>
        </div>
      )}

      <button className="btn btn-primary w-full py-3.5 text-base" onClick={onCreate} disabled={busy || !valid}>
        {busy
          ? <><span className="anim-spin-slow inline-block">⟳</span> Confirming…</>
          : "✨ Create Position"
        }
      </button>
    </div>
  );
}

// ── Deposit / Withdraw Form ───────────────────────────────────────────────────
function FundForm({
  mode, amount, setAmount, maxBalance, busy, needsApproval, onAction,
}: {
  mode: "deposit" | "withdraw";
  amount: string; setAmount: (v: string) => void;
  maxBalance: string; busy: boolean;
  needsApproval: boolean; onAction: () => void;
}) {
  const isDeposit = mode === "deposit";
  return (
    <div className="glass-strong p-6 rounded-2xl flex flex-col gap-5 anim-fade-up">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg bg-gradient-to-br ${isDeposit ? "from-emerald-500 to-teal-600" : "from-red-500 to-orange-600"}`}>
          {isDeposit ? "💰" : "📤"}
        </div>
        <div>
          <div className="font-bold text-white">{isDeposit ? "Deposit USDC" : "Withdraw USDC"}</div>
          <div className="text-xs text-slate-500">{isDeposit ? "Fund your DCA vault" : "Withdraw unused funds"}</div>
        </div>
      </div>

      <div className="divider" />

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</label>
          <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
            onClick={() => setAmount(maxBalance)}>
            Max: ${maxBalance}
          </button>
        </div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
          <input className="input pl-8 text-lg font-mono" type="number" min="0" step="0.01"
            placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">USDC</span>
        </div>
      </div>

      {isDeposit && amount && needsApproval && (
        <div className="glass-md p-3.5 rounded-xl flex items-start gap-3 border border-yellow-500/20">
          <span className="text-yellow-400 text-base mt-0.5">⚠</span>
          <div className="text-xs text-yellow-300/80 leading-relaxed">
            First transaction will approve USDC spending. Second will deposit. Two transactions total.
          </div>
        </div>
      )}

      <button
        className={`btn w-full py-3.5 text-base ${isDeposit ? "btn-primary" : "btn-danger"}`}
        onClick={onAction} disabled={busy || !amount || parseFloat(amount) <= 0}>
        {busy
          ? <><span className="anim-spin-slow inline-block">⟳</span> Confirming…</>
          : isDeposit
            ? (needsApproval ? "🔓 Approve USDC" : "💰 Deposit")
            : "📤 Withdraw"
        }
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const [tab, setTab] = useState<Tab>("overview");
  const [amount, setAmount] = useState("");
  const [amtPerRun, setAmtPerRun] = useState("");
  const [intervalIdx, setIntervalIdx] = useState(0);
  const [runs, setRuns] = useState("10");
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" | "info" } | null>(null);
  const [showWallet, setShowWallet] = useState(false);

  const showToast = (msg: string, type: "ok" | "err" | "info" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // reads
  const { data: position, refetch: refetchPos } = useReadContract({
    address: AUTOSTACK_ADDRESS, abi: AUTOSTACK_ABI, functionName: "getPosition",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address, refetchInterval: 10_000 },
  });
  const { data: stats, refetch: refetchStats } = useReadContract({
    address: AUTOSTACK_ADDRESS, abi: AUTOSTACK_ABI, functionName: "getStats",
    query: { refetchInterval: 15_000 },
  });
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address, refetchInterval: 10_000 },
  });
  const { data: vaultBalance } = useReadContract({
    address: AUTOSTACK_ADDRESS, abi: AUTOSTACK_ABI, functionName: "usdcBalances",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address, refetchInterval: 10_000 },
  });
  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "allowance",
    args: [address ?? "0x0000000000000000000000000000000000000000", AUTOSTACK_ADDRESS],
    query: { enabled: !!address, refetchInterval: 8_000 },
  });
  const { data: canExec } = useReadContract({
    address: AUTOSTACK_ADDRESS, abi: AUTOSTACK_ABI, functionName: "canExecute",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  useEffect(() => {
    if (isSuccess) {
      showToast("Transaction confirmed ✓");
      refetchPos(); refetchStats();
      setAmount(""); setAmtPerRun(""); setRuns("10");
    }
  }, [isSuccess]);

  const needsApproval = (amt: string) => {
    const parsed = u6(amt);
    return !allowance || (allowance as bigint) < parsed;
  };

  const handleDeposit = () => {
    if (needsApproval(amount)) {
      writeContract({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "approve", args: [AUTOSTACK_ADDRESS, parseUnits("999999", 6)] });
    } else {
      writeContract({ address: AUTOSTACK_ADDRESS, abi: AUTOSTACK_ABI, functionName: "deposit", args: [u6(amount)] });
    }
  };
  const handleCreate = () => {
    writeContract({ address: AUTOSTACK_ADDRESS, abi: AUTOSTACK_ABI, functionName: "createPosition", args: [u6(amtPerRun), BigInt(INTERVALS[intervalIdx].value), BigInt(runs)] });
  };
  const handleWithdraw = () => {
    writeContract({ address: AUTOSTACK_ADDRESS, abi: AUTOSTACK_ABI, functionName: "withdraw", args: [u6(amount)] });
  };
  const handleExecute = () => {
    if (!address) return;
    writeContract({ address: AUTOSTACK_ADDRESS, abi: AUTOSTACK_ABI, functionName: "execute", args: [address] });
  };
  const handlePause  = () => writeContract({ address: AUTOSTACK_ADDRESS, abi: AUTOSTACK_ABI, functionName: "pause",         args: [] });
  const handleResume = () => writeContract({ address: AUTOSTACK_ADDRESS, abi: AUTOSTACK_ABI, functionName: "resume",        args: [] });
  const handleClose  = () => writeContract({ address: AUTOSTACK_ADDRESS, abi: AUTOSTACK_ABI, functionName: "closePosition", args: [] });

  const busy = isPending || isConfirming;
  const pos = position as any;
  const hasPosition = pos && pos.owner !== "0x0000000000000000000000000000000000000000";
  const walletUsdc  = usdcBalance  ? f6(usdcBalance  as bigint) : "0.00";
  const vaultUsdc   = vaultBalance ? f6(vaultBalance as bigint) : "0.00";

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "Overview",  icon: "📊" },
    { id: "create",   label: "Create",    icon: "✨" },
    { id: "deposit",  label: "Deposit",   icon: "💰" },
    { id: "withdraw", label: "Withdraw",  icon: "📤" },
  ];

  return (
    <>
      {/* Background layers */}
      <div className="bg-mesh" />
      <div className="bg-grid" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Wallet modal */}
      {showWallet && <WalletModal onClose={() => setShowWallet(false)} />}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div className="relative z-10 min-h-screen flex flex-col">

        {/* ── Ticker ── */}
        <div className="border-b border-white/5 bg-black/20 py-2 overflow-hidden">
          <div className="ticker-wrap">
            <div className="ticker-inner">
              {TICKER_ITEMS.map((item, i) => (
                <span key={i} className="text-xs text-slate-500 px-8 whitespace-nowrap">{item}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <header className="sticky top-0 z-40 border-b border-white/5 bg-black/30 backdrop-blur-2xl">
          <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg shadow-lg shadow-blue-500/25">
                  ⚡
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black" />
              </div>
              <div>
                <div className="font-extrabold text-sm tracking-tight shimmer-text">AutoStack</div>
                <div className="text-xs text-slate-600">DCA Protocol</div>
              </div>
            </div>

            {/* Nav links (desktop) */}
            <nav className="hidden md:flex items-center gap-1">
              {["Protocol", "Docs", "Analytics"].map(l => (
                <a key={l} href="#" className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all">{l}</a>
              ))}
            </nav>

            {/* Right */}
            <div className="flex items-center gap-3">
              <a href={`https://sepolia.basescan.org/address/${AUTOSTACK_ADDRESS}`} target="_blank" rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 border border-white/7 hover:border-white/14 transition-all">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Base Sepolia
              </a>

              {isConnected ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-xs font-mono text-slate-300">{address ? short(address) : ""}</span>
                    <span className="text-xs text-slate-600">${walletUsdc} USDC</span>
                  </div>
                  <button onClick={() => disconnect()}
                    className="btn btn-ghost text-xs py-2 px-3">
                    Disconnect
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowWallet(true)} className="btn btn-primary text-sm py-2.5 px-5">
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ── Main content ── */}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 flex flex-col gap-8">

          {/* Hero */}
          <div className="text-center flex flex-col items-center gap-5 py-6 anim-fade-up">
            <div className="flex items-center gap-2">
              <span className="badge badge-blue">⚡ Base Sepolia</span>
              <span className="badge badge-green">● Live</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-none">
              <span className="grad-blue">Dollar Cost</span>
              <br />
              <span className="text-white">Average ETH</span>
            </h1>
            <p className="text-slate-400 max-w-lg text-base leading-relaxed">
              Automate recurring USDC → ETH swaps on Base. Set your schedule, fund your vault, and let AutoStack handle the rest.
            </p>
            {!isConnected && (
              <button onClick={() => setShowWallet(true)} className="btn btn-primary text-base py-3.5 px-8 mt-2">
                Launch App →
              </button>
            )}
          </div>

          {/* Protocol stats */}
          <ProtocolStats stats={stats as any} />

          {/* Connected UI */}
          {isConnected ? (
            <div className="flex flex-col gap-6">
              {/* Balance bar */}
              <div className="glass p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-sm">💵</div>
                  <div>
                    <div className="text-xs text-slate-500">Wallet USDC</div>
                    <div className="font-bold font-mono text-emerald-400">${walletUsdc}</div>
                  </div>
                </div>
                <div className="w-px h-8 bg-white/7 hidden sm:block" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-sm">🏦</div>
                  <div>
                    <div className="text-xs text-slate-500">Vault Balance</div>
                    <div className="font-bold font-mono text-blue-400">${vaultUsdc}</div>
                  </div>
                </div>
                <div className="w-px h-8 bg-white/7 hidden sm:block" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-sm">📍</div>
                  <div>
                    <div className="text-xs text-slate-500">Address</div>
                    <div className="font-bold font-mono text-purple-300 text-sm">{address ? short(address) : ""}</div>
                  </div>
                </div>
                {chain?.id !== baseSepolia.id && (
                  <div className="sm:ml-auto badge badge-red">⚠ Wrong Network</div>
                )}
              </div>

              {/* Tabs */}
              <div className="glass p-1.5 rounded-2xl grid grid-cols-4 gap-1">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5
                      ${tab === t.id ? "tab-active" : "tab-inactive"}`}>
                    <span className="text-base">{t.icon}</span>
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {tab === "overview" && (
                hasPosition ? (
                  <PositionPanel
                    pos={pos} canExec={canExec as boolean} busy={busy}
                    onExecute={handleExecute} onPause={handlePause}
                    onResume={handleResume} onClose={handleClose}
                  />
                ) : (
                  <div className="glass-strong p-12 rounded-2xl flex flex-col items-center gap-5 text-center anim-fade-up">
                    <div className="text-6xl anim-float">⚡</div>
                    <div>
                      <h3 className="font-bold text-xl text-white mb-2">No Active Position</h3>
                      <p className="text-slate-400 text-sm max-w-xs">Deposit USDC and create a DCA position to start stacking ETH automatically.</p>
                    </div>
                    <div className="flex gap-3">
                      <button className="btn btn-primary" onClick={() => setTab("deposit")}>💰 Deposit First</button>
                      <button className="btn btn-ghost" onClick={() => setTab("create")}>✨ Create Position</button>
                    </div>
                  </div>
                )
              )}

              {tab === "create" && (
                <CreateForm
                  amtPerRun={amtPerRun} setAmtPerRun={setAmtPerRun}
                  intervalIdx={intervalIdx} setIntervalIdx={setIntervalIdx}
                  runs={runs} setRuns={setRuns}
                  busy={busy} onCreate={handleCreate}
                />
              )}

              {tab === "deposit" && (
                <FundForm
                  mode="deposit" amount={amount} setAmount={setAmount}
                  maxBalance={walletUsdc} busy={busy}
                  needsApproval={needsApproval(amount)}
                  onAction={handleDeposit}
                />
              )}

              {tab === "withdraw" && (
                <FundForm
                  mode="withdraw" amount={amount} setAmount={setAmount}
                  maxBalance={vaultUsdc} busy={busy}
                  needsApproval={false}
                  onAction={handleWithdraw}
                />
              )}
            </div>
          ) : (
            /* Not connected — show how it works */
            <HowItWorks />
          )}

          {/* Features grid (always visible) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: "🛡", title: "Non-Custodial", desc: "Your funds stay in the contract. Only you can withdraw.", color: "from-blue-500/10 to-blue-600/5", border: "border-blue-500/15" },
              { icon: "⚡", title: "Gas Efficient", desc: "Optimized Solidity contracts minimize execution costs.", color: "from-purple-500/10 to-purple-600/5", border: "border-purple-500/15" },
              { icon: "🔄", title: "Fully Automated", desc: "Set your schedule once. AutoStack executes on-chain.", color: "from-emerald-500/10 to-emerald-600/5", border: "border-emerald-500/15" },
            ].map(f => (
              <div key={f.title} className={`p-5 rounded-2xl bg-gradient-to-br ${f.color} border ${f.border} flex flex-col gap-3`}>
                <span className="text-3xl">{f.icon}</span>
                <div>
                  <div className="font-bold text-sm text-white mb-1">{f.title}</div>
                  <div className="text-xs text-slate-500 leading-relaxed">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

        </main>

        {/* ── Footer ── */}
        <footer className="border-t border-white/5 bg-black/20">
          <div className="max-w-6xl mx-auto px-5 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="shimmer-text font-bold text-sm">AutoStack</span>
              <span>·</span>
              <span>DCA Protocol on Base</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <a href={`https://sepolia.basescan.org/address/${AUTOSTACK_ADDRESS}`} target="_blank" rel="noreferrer"
                className="hover:text-blue-400 transition-colors flex items-center gap-1">
                Contract ↗
              </a>
              <a href="https://github.com/nodecapitalnext/autostack" target="_blank" rel="noreferrer"
                className="hover:text-slate-300 transition-colors">
                GitHub ↗
              </a>
              <span className="text-slate-700">© 2025</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
