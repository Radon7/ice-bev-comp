import type { Metadata } from "next";
import ThemeRegistry from "@/components/ThemeRegistry";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Fuel vs Electric Car - Monte Carlo Simulation (Italy)",
  description: "Compare total cost of ownership for gasoline, diesel, and electric cars using Monte Carlo price simulation calibrated on European Commission data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
