import "./globals.css";
import "./depth.css";
import "./depth-pricing.css";
import "./commerce-depth.css";
import "./judge-visual.css";
import type { Metadata } from "next";
import DepthEnhancer from "./DepthEnhancer";
import WebsitePriceEditor from "./WebsitePriceEditor";
import UiPolish from "./UiPolish";
import CommerceDepthFix from "./CommerceDepthFix";
import JudgeVisualStudio from "./JudgeVisualStudio";

export const metadata: Metadata = {
  title: "LaunchForge AI",
  description: "Turn product chaos into a business ready to launch."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<DepthEnhancer/><WebsitePriceEditor/><UiPolish/><CommerceDepthFix/><JudgeVisualStudio/></body></html>;
}
