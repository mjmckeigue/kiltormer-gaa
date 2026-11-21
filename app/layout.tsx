import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kiltormer GAA Coaching Hub", template: "%s · Kiltormer GAA" },
  description: "Coaching resources and team management for Cill Tormóir coaches",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#0a37f6" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IE" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
