import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "AutoStack — DCA on Base" }),
    walletConnect({ projectId: "b56e18d47c72ab683b10814fe9495694" }),
  ],
  transports: { [baseSepolia.id]: http("https://sepolia.base.org") },
});
