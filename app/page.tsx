"use client";
import { useState, useEffect } from "react";
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
import { StatsBar } from "@/components/StatsBar";

// ─── helpers ────────────────────────────────────────────────────────────────
const u6 = (n: string) => parseUnits(n || "0", 6);
const f6 = (n: bigint) => parseFloat(formatUnits(n, 6)).toFixed(2);

type Tab = "dashboard" | "create" | "deposit" | "withdraw";

// ─── main ────────────────────────────────────────────────────────────────────
export default function Home() {
  const { address, isConnected, chain } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  const [tab, setTab] = useState<Tab>("dashboard");
  const [amount, setAmount] = useState("");
  const [amtPerRun, setAmtPerRun] = useState("");
  const [intervalIdx, setIntervalIdx] = useState(0);
  const [runs, setRuns] = useState("10");
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [showWallets, setShowWallets] = useState(false);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── reads ──────────────────────────────────────────────────────────────────
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

  // ── writes ─────────────────────────────────────────────────────────────────
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

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

  const handleApprove = () => {
    writeContract({
      address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "approve",
      args: [AUTOSTACK_ADDRESS, parseUnits("999999", 6)],
    });
  };

  const handleDeposit = () => {
    if (needsApproval(amount)) return handleApprove();
    writeContract({
      address: AUTOSTACK_ADDRESS, abi: AUTOSTACK_ABI, functionName: "deposit",
      args: [u6(amount)],
    });
  };

  const handleCreate = () => {
    writeContract({
      address: AUTOSTACK_ADDRESS, abi: AUTOSTACK_ABI, functionName: "createPosition",
      args: [u6(amtPerRun), BigInt(INTERVALS[intervalIdx].value), BigInt(runs)],
    });
  };

  const handleWithdraw = () => {
    writeContract({
      address: AUTOSTACK_ADDRESS, abi: AUTOSTACK_ABI, functionName: "withdraw",
      args: [u6(amount)],
    });
  };

  const handlePause = () => {
    writeContract({ address: AUTOSTACK_ADDRESS, abi: AUTOSTACK_ABI, functionName: "pause", args: [] });
  };

  const handleResume = () => {
    writeContract({ address: AUTOSTACK_ADDRESS, abi: AUTOSTACK_ABI, functionName: "resume", args: [] });
  };

  const handleClose = () => {
    writeContract({ address: AUTOSTACK_ADDRESS, abi: AUTOSTACK_ABI, functionName: "closePosition", args: [] });
  };

  const handleExecute = () => {
    if (!address) return;
    writeContract({
      address: AUTOSTACK_ADDRESS, abi: AUTOSTACK_ABI, functionName: "execute",
      args: [address],
    });
  };

  const busy = isPending || isConfirming;
  const pos = position as any;
  const hasPosition = pos && pos.owner !== "0x0000000000000000000000000000000000000000";

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <main className="relative min-h-screen z-10">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 glass px-5 py-3 rounded-xl text-sm font-medium shadow-2xl transition-all
          ${toast.type === "ok" ? "border-green-500/30 text-green-300" : "border-red-500/30 text-red-300"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/5 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg shadow-lg">
              ⚡
            </div>
            <div>
              <div className="font-bold text-base gradient-text">AutoStack</div>
              <div className="text-xs text-slate-500">DCA Protocol · Base Sepolia</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isConnected && chain?.id !== baseSepolia.id && (
              <span className="badge badge-red">Wrong Network</span>
            )}
            {isConnected ? (
              <div className="flex items-center gap-2">
                <div className="glass px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300">
                  {address?.slice(0, 6)}…{address?.slice(-4)}
                </div>
                <button className="btn btn-secondary text-xs py-1.5 px-3" onClick={() => disconnect()}>
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="relative">
                <button className="btn btn-primary text-sm" onClick={() => setShowWallets(!showWallets)}>
                  Connect Wallet
                </button>
                {showWallets && (
                  <div className="absolute right-0 top-12 glass-strong rounded-2xl p-2 min-w-[200px] shadow-2xl z-50 flex flex-col gap-1">
                    {connectors.map((c) => (
                      <button key={c.id} className="btn btn-secondary text-sm justify-start"
                        onClick={() => { connect({ connector: c }); setShowWallets(false); }}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8">

        {/* Hero */}
        <div className="text-center flex flex-col items-center gap-4 py-4">
          <div className="badge badge-blue text-xs">Base Sepolia Testnet</div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            <span className="gradient-text">Automate Your</span>
            <br />
            <span className="text-white">ETH Accumulation</span>
          </h1>
          <p className="text-slate-400 max-w-md text-sm leading-relaxed">
            Set a recurring USDC → ETH buy schedule. AutoStack executes on-chain DCA so you never miss a dip.
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <StatsBar
            totalPositions={(stats as any)[0] ?? 0n}
            totalVolumeUSDC={(stats as any)[1] ?? 0n}
            totalFees={(stats as any)[2] ?? 0n}
            activeUsers={(stats as any)[3] ?? 0n}
          />
        )}

        {/* Balances */}
        {isConnected && (
          <div className="grid grid-cols-2 gap-3">
            <div className="glass p-4 rounded-2xl flex flex-col gap-1">
              <span className="text-xs text-slate-400">Wallet USDC</span>
              <span className="text-2xl font-bold text-green-400 font-mono">
                ${usdcBalance ? f6(usdcBalance as bigint) : "—"}
              </span>
            </div>
            <div className="glass p-4 rounded-2xl flex flex-col gap-1">
              <span className="text-xs text-slate-400">Vault Balance</span>
              <span className="text-2xl font-bold text-blue-400 font-mono">
                ${vaultBalance ? f6(vaultBalance as bigint) : "—"}
              </span>
            </div>
          </div>
        )}

        {/* Tabs */}
        {isConnected && (
          <div className="flex flex-col gap-6">
            <div className="glass p-1 rounded-2xl flex gap-1">
              {(["dashboard", "create", "deposit", "withdraw"] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all
                    ${tab === t ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}>
                  {t === "dashboard" ? "📊 Dashboard" : t === "create" ? "✨ Create" : t === "deposit" ? "💰 Deposit" : "📤 Withdraw"}
                </button>
              ))}
            </div>

            {/* Dashboard Tab */}
            {tab === "dashboard" && (
              <div className="flex flex-col gap-4">
                {hasPosition ? (
                  <>
                    <div className="glass-strong p-6 rounded-2xl flex flex-col gap-5">
                      <div className="flex items-center justify-between">
                        <h2 className="font-bold text-lg">Your DCA Position</h2>
                        <div className="flex gap-2">
                          {pos.paused
                            ? <span className="badge badge-gray">⏸ Paused</span>
                            : <span className="badge badge-green">🟢 Active</span>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          { label: "Per Run", value: `$${f6(pos.amountPerRun)}`, color: "text-blue-300" },
                          { label: "Runs Left", value: `${pos.runsRemaining}`, color: "text-purple-300" },
                          { label: "Runs Done", value: `${pos.runsCompleted}`, color: "text-green-300" },
                          { label: "Total Spent", value: `$${f6(pos.totalSpent)}`, color: "text-yellow-300" },
                          { label: "ETH Stacked", value: `${formatUnits(pos.ethAccumulated, 18).slice(0, 8)} ETH`, color: "text-cyan-300" },
                          { label: "Total Deposited", value: `$${f6(pos.totalDeposited)}`, color: "text-slate-300" },
                        ].map((s) => (
                          <div key={s.label} className="stat-card">
                            <div className="text-xs text-slate-400 mb-1">{s.label}</div>
                            <div className={`font-bold font-mono ${s.color}`}>{s.value}</div>
                          </div>
                        ))}
                      </div>

                      {pos.nextExecution > 0n && (
                        <CountdownTimer nextExecution={pos.nextExecution} />
                      )}

                      <div className="flex flex-wrap gap-2 pt-2">
                        {canExec && (
                          <button className="btn btn-success text-sm" onClick={handleExecute} disabled={busy}>
                            {busy ? "⏳ Executing…" : "▶ Execute Now"}
                          </button>
                        )}
                        {pos.paused
                          ? <button className="btn btn-secondary text-sm" onClick={handleResume} disabled={busy}>▶ Resume</button>
                          : <button className="btn btn-secondary text-sm" onClick={handlePause} disabled={busy}>⏸ Pause</button>
                        }
                        <button className="btn btn-danger text-sm" onClick={handleClose} disabled={busy}>✕ Close Position</button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="glass p-10 rounded-2xl flex flex-col items-center gap-4 text-center">
                    <div className="text-5xl animate-float">⚡</div>
                    <h3 className="font-bold text-xl">No Active Position</h3>
                    <p className="text-slate-400 text-sm max-w-xs">
                      Deposit USDC and create a DCA position to start automatically stacking ETH.
                    </p>
                    <button className="btn btn-primary" onClick={() => setTab("deposit")}>
                      Get Started →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Create Tab */}
            {tab === "create" && (
              <div className="glass-strong p-6 rounded-2xl flex flex-col gap-5">
                <h2 className="font-bold text-lg">✨ Create DCA Position</h2>
                <p className="text-slate-400 text-sm">Define how much USDC to buy ETH with, and how often.</p>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-400 font-medium">USDC per run</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input className="input pl-7" type="number" placeholder="10.00" value={amtPerRun}
                        onChange={(e) => setAmtPerRun(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-400 font-medium">Frequency</label>
                    <div className="grid grid-cols-3 gap-2">
                      {INTERVALS.map((iv, i) => (
                        <button key={iv.label} onClick={() => setIntervalIdx(i)}
                          className={`glass p-3 rounded-xl text-sm font-semibold transition-all border
                            ${intervalIdx === i ? "border-blue-500 text-blue-300 bg-blue-500/10" : "border-white/5 text-slate-400 hover:border-white/15"}`}>
                          <div>{iv.label}</div>
                          <div className="text-xs font-normal opacity-60">{iv.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-400 font-medium">Number of runs</label>
                    <input className="input" type="number" placeholder="10" value={runs}
                      onChange={(e) => setRuns(e.target.value)} />
                    {amtPerRun && runs && (
                      <span className="text-xs text-slate-500">
                        Total: ${(parseFloat(amtPerRun || "0") * parseInt(runs || "0")).toFixed(2)} USDC
                      </span>
                    )}
                  </div>

                  <button className="btn btn-primary w-full" onClick={handleCreate} disabled={busy || !amtPerRun || !runs}>
                    {busy ? "⏳ Confirming…" : "✨ Create Position"}
                  </button>
                </div>
              </div>
            )}

            {/* Deposit Tab */}
            {tab === "deposit" && (
              <div className="glass-strong p-6 rounded-2xl flex flex-col gap-5">
                <h2 className="font-bold text-lg">💰 Deposit USDC</h2>
                <p className="text-slate-400 text-sm">
                  Deposit USDC into the vault. The protocol uses this balance to execute your DCA buys.
                </p>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <label className="text-xs text-slate-400 font-medium">Amount (USDC)</label>
                      {usdcBalance && (
                        <button className="text-xs text-blue-400 hover:text-blue-300"
                          onClick={() => setAmount(f6(usdcBalance as bigint))}>
                          Max: ${f6(usdcBalance as bigint)}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input className="input pl-7" type="number" placeholder="100.00" value={amount}
                        onChange={(e) => setAmount(e.target.value)} />
                    </div>
                  </div>

                  {amount && needsApproval(amount) && (
                    <div className="glass p-3 rounded-xl text-xs text-yellow-300 border border-yellow-500/20">
                      ⚠ You need to approve USDC first. Click below to approve, then deposit.
                    </div>
                  )}

                  <button className="btn btn-primary w-full" onClick={handleDeposit} disabled={busy || !amount}>
                    {busy ? "⏳ Confirming…" : needsApproval(amount) ? "🔓 Approve USDC" : "💰 Deposit"}
                  </button>
                </div>
              </div>
            )}

            {/* Withdraw Tab */}
            {tab === "withdraw" && (
              <div className="glass-strong p-6 rounded-2xl flex flex-col gap-5">
                <h2 className="font-bold text-lg">📤 Withdraw USDC</h2>
                <p className="text-slate-400 text-sm">
                  Withdraw unused USDC from the vault back to your wallet.
                </p>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <label className="text-xs text-slate-400 font-medium">Amount (USDC)</label>
                      {vaultBalance && (
                        <button className="text-xs text-blue-400 hover:text-blue-300"
                          onClick={() => setAmount(f6(vaultBalance as bigint))}>
                          Max: ${f6(vaultBalance as bigint)}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input className="input pl-7" type="number" placeholder="50.00" value={amount}
                        onChange={(e) => setAmount(e.target.value)} />
                    </div>
                  </div>
                  <button className="btn btn-danger w-full" onClick={handleWithdraw} disabled={busy || !amount}>
                    {busy ? "⏳ Confirming…" : "📤 Withdraw"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Not connected CTA */}
        {!isConnected && (
          <div className="glass p-10 rounded-2xl flex flex-col items-center gap-5 text-center glow-blue">
            <div className="text-6xl animate-float">⚡</div>
            <h2 className="text-2xl font-bold">Start Stacking ETH</h2>
            <p className="text-slate-400 text-sm max-w-sm">
              Connect your wallet to create a DCA position and automate your ETH accumulation on Base.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {connectors.map((c) => (
                <button key={c.id} className="btn btn-primary" onClick={() => connect({ connector: c })}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-slate-600 pb-4">
          AutoStack · DCA Protocol on Base Sepolia ·{" "}
          <a href={`https://sepolia.basescan.org/address/${AUTOSTACK_ADDRESS}`}
            target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-400">
            Contract ↗
          </a>
        </footer>
      </div>
    </main>
  );
}
