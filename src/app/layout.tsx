import type { Metadata } from "next";
import { Noto_Serif } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

const appFont = Noto_Serif({
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
  variable: "--font-app",
});

export const metadata: Metadata = {
  title: "AI Story",
  description: "Premium AI-generated interactive fiction with long-running sessions.",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    const stored = localStorage.getItem("ai-story.theme-preference");
    const preference = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    const resolved = preference === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : preference;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  } catch {}
})();`,
          }}
        />
      </head>
      <body className={appFont.variable} suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
