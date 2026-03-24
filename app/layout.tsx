import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Humor Flavor Control Room",
  description: "Prompt-chain control room for humor flavors, captions, and test runs.",
};

const themeBootstrapScript = `
(() => {
  const resolveTheme = (mode) => {
    if (mode === "light" || mode === "dark") {
      return mode;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  try {
    const stored = window.localStorage.getItem("humor-control-room-theme");
    const mode = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    const theme = resolveTheme(mode);
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themeMode = mode;
    document.documentElement.style.colorScheme = theme;
  } catch {
    const theme = resolveTheme("system");
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themeMode = "system";
    document.documentElement.style.colorScheme = theme;
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
