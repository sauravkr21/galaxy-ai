import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { AttributionLog } from "@/components/AttributionLog";
import "./globals.css";
import "@xyflow/react/dist/style.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NextFlow — LLM Workflow Builder",
  description:
    "A focused clone of the Galaxy.ai workflow builder for LLM workflows. Built with Next.js, React Flow, Gemini and Trigger.dev.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#7c5cff",
          borderRadius: "0.7rem",
          fontFamily: "var(--font-inter)",
        },
      }}
    >
      <html lang="en" className={`${inter.variable} ${mono.variable} h-full`}>
        <body className="min-h-full">
          <AttributionLog />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
