import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "TradeCal — Trading Journal",
  description: "A personal trading journal with a monthly P&L calendar."
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}