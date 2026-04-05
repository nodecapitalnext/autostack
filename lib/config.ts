export const AUTOSTACK_ADDRESS = "0x0Bc8A76cd4c9945b0c75b518d9178B617d9d3Bfa" as const;
export const USDC_ADDRESS      = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

export const AUTOSTACK_ABI = [
  { name: "deposit",        type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "createPosition", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amountPerRun", type: "uint256" }, { name: "interval", type: "uint256" }, { name: "runsRemaining", type: "uint256" }], outputs: [] },
  { name: "execute",        type: "function", stateMutability: "nonpayable", inputs: [{ name: "user", type: "address" }], outputs: [] },
  { name: "pause",          type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "resume",         type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "closePosition",  type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "withdraw",       type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "getPosition",    type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "tuple", components: [
    { name: "owner",           type: "address" },
    { name: "amountPerRun",    type: "uint256" },
    { name: "interval",        type: "uint256" },
    { name: "totalDeposited",  type: "uint256" },
    { name: "totalSpent",      type: "uint256" },
    { name: "ethAccumulated",  type: "uint256" },
    { name: "lastExecution",   type: "uint256" },
    { name: "nextExecution",   type: "uint256" },
    { name: "runsCompleted",   type: "uint256" },
    { name: "runsRemaining",   type: "uint256" },
    { name: "active",          type: "bool" },
    { name: "paused",          type: "bool" },
  ]}]},
  { name: "getStats",       type: "function", stateMutability: "view", inputs: [], outputs: [
    { name: "_totalPositions",    type: "uint256" },
    { name: "_totalVolumeUSDC",   type: "uint256" },
    { name: "_totalFeesCollected",type: "uint256" },
    { name: "_activeUsers",       type: "uint256" },
  ]},
  { name: "usdcBalances",   type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "canExecute",     type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "bool" }] },
] as const;

export const ERC20_ABI = [
  { name: "approve",   type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "allowance", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

export const INTERVALS = [
  { label: "Daily",   value: 86400,    desc: "Every 24 hours" },
  { label: "Weekly",  value: 604800,   desc: "Every 7 days" },
  { label: "Monthly", value: 2592000,  desc: "Every 30 days" },
];
