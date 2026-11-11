export const THEME_KEY = "zaproom:theme";
export type ThemeChoice = "light" | "dark" | "system";

/**
 * Runs in <head> before the page paints, so a saved light/dark choice never flashes.
 * Dark is the default: video looks better on it.
 */
export const themeScript = `(function(){try{var c=localStorage.getItem(${JSON.stringify(THEME_KEY)});var d=c==="light"?false:c==="dark"?true:c==="system"?matchMedia("(prefers-color-scheme: dark)").matches:true;var r=document.documentElement;r.dataset.theme=d?"dark":"light";r.dataset.choice=c||"dark";r.style.colorScheme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export function applyTheme(choice: ThemeChoice) {
  const dark = choice === "dark" || (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.dataset.theme = dark ? "dark" : "light";
  root.dataset.choice = choice;
  root.style.colorScheme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#16122E" : "#F3F1FB");
}
