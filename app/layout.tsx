import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "AutoStack — DCA Protocol on Base",
  description: "Automatically stack ETH with USDC on Base. Set it, forget it.",
  openGraph: {
    title: "AutoStack — DCA Protocol on Base",
    description: "Automatically stack ETH with USDC on Base.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
