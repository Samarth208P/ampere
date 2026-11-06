import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "AMPERE — Infrastructure flight recorder",
  description:
    "Measured requests. Inspectable evidence. Verifiable incident reports.",
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
