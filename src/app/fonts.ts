import localFont from "next/font/local";

/**
 * The same variable fonts as before, loaded through next/font: preloaded, and with a
 * fallback font sized to match, so text doesn't jump when the real font arrives.
 * Latin covers the interface; other scripts in names use the matched fallback.
 */
export const body = localFont({
  src: "../../node_modules/@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-hanken",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
  adjustFontFallback: "Arial",
});

export const display = localFont({
  src: "../../node_modules/@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2",
  weight: "200 900",
  variable: "--font-unbounded",
  display: "swap",
  fallback: ["Arial Black", "system-ui", "sans-serif"],
  adjustFontFallback: "Arial",
});
