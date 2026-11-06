import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "AMPERE — Infrastructure flight recorder",
  description:
    "Measured requests. Inspectable evidence. Verifiable incident reports.",
  icons: { icon: "/brand/ampere-mark.png", apple: "/brand/ampere-mark.png" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
