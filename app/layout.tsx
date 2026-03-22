import type { Metadata } from "next";
import ThemeRegistry from "@/components/ThemeRegistry";

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
    <html lang="en">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
