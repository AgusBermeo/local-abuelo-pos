import type { Metadata } from "next";
import "./globals.css";
import { Poppins, Manufacturing_Consent } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const manufacturingConsent = Manufacturing_Consent({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  variable: "--font-manufacturing-consent",
});

export const metadata: Metadata = {
  title: "El Local del Abuelo",
  description: "POS para El Local del Abuelo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manufacturingConsent.variable} ${poppins.variable} h-full antialiased`}
      >
      <body className={`min-h-full flex flex-col`}>{children}</body>
    </html>
  );
}
