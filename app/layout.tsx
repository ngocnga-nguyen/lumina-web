import { Geist, Geist_Mono } from "next/font/google";
import AuthenticatedWorkspaceRail from "@/components/AuthenticatedWorkspaceRail";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Lumina | Discover beauty professionals",
  description:
    "Compare beauty professionals through services, pricing, portfolios, requests, and verified client reviews.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-lumina-bg text-lumina-text">
        <AuthenticatedWorkspaceRail />
        <div className="min-w-0 flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}
