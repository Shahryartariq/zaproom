"use client";

import { useEffect, useId, useSyncExternalStore } from "react";
import { THEME_KEY, applyTheme, type ThemeChoice } from "@/lib/theme";
import { Icon } from "./Icon";

const OPTIONS: { value: ThemeChoice; label: string; icon: "sun" | "moon" | "system" }[] = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "Match device", icon: "system" },
];

function readChoice(): ThemeChoice {
  return (document.documentElement.dataset.choice as ThemeChoice) || "dark";
}

/** The head script and applyTheme() write data-choice on <html>; watch it. */
function subscribeChoice(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-choice"] });
  return () => observer.disconnect();
}

export function ThemeSwitch() {
  const id = useId();
  const choice = useSyncExternalStore(subscribeChoice, readChoice, () => null);

  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onDevice = () => {
      if (document.documentElement.dataset.choice === "system") applyTheme("system");
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_KEY) return;
      const next = (e.newValue as ThemeChoice) || "dark";
      applyTheme(next);
    };
    media.addEventListener("change", onDevice);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onDevice);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function pick(next: ThemeChoice) {
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Not saved in private mode; the switch still works for this page.
    }
  }

  return (
    <div className="theme-switch" role="radiogroup" aria-label="Theme">
      {OPTIONS.map((o) => (
        <span key={o.value}>
          <input
            type="radio"
            id={`${id}-${o.value}`}
            name={`${id}-theme`}
            value={o.value}
            checked={choice === o.value}
            onChange={() => pick(o.value)}
          />
          <label htmlFor={`${id}-${o.value}`} title={o.label}>
            <Icon name={o.icon} />
            <span className="sr-only">{o.label}</span>
          </label>
        </span>
      ))}
    </div>
  );
}
