import "./globals.css";
import "./depth.css";
import type { Metadata } from "next";
import DepthEnhancer from "./DepthEnhancer";

export const metadata: Metadata = {
  title: "LaunchForge AI",
  description: "Turn product chaos into a business ready to launch."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<DepthEnhancer/></body></html>;
}
