import "./globals.css";
import "./demo-match.css";
import type { Metadata } from "next";
import DemoMatchExperience from "./DemoMatchExperience";

export const metadata: Metadata = {
  title: "LaunchForge AI",
  description: "Turn product chaos into a business ready to launch."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<DemoMatchExperience/></body></html>;
}
