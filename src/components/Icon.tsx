const paths = {
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0M12 19v3",
  micOff: "M9 9v3a3 3 0 0 0 5.1 2.1M15 9.3V6a3 3 0 0 0-5.7-1.3M5 12a7 7 0 0 0 11.9 5M19 12a7 7 0 0 1-.4 2.3M12 19v3M3 3l18 18",
  cam: "M3 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm13 3 5-3v10l-5-3",
  camOff: "M3 7a2 2 0 0 1 2-2h1m4 0h4a2 2 0 0 1 2 2v4l5-3v10l-3-1.8M16 16v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9M3 3l18 18",
  screen: "M3 5h18v11H3zM8 20h8M12 16v4M9 11l3-3 3 3M12 8v5",
  chat: "M4 5h16v11H9l-5 4Z",
  people: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0M16 3.3a4 4 0 0 1 0 7.4M22 20a7 7 0 0 0-4-6.3",
  leave: "M10 17l-5-5 5-5M5 12h11M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4",
  smile: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  send: "M4 12 20 4l-6 16-3-7Z",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z",
  system: "M3 4h18v12H3zM8 20h8M12 16v4",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
  wave: "M3 12h2l2-5 3 10 3-14 3 12 2-6 3 3",
  next: "M5 5l8 7-8 7M15 5v14",
  close: "M6 6l12 12M18 6 6 18",
  edit: "M4 20h4L19 9l-4-4L4 16Zm9-13 4 4",
  check: "M5 12l5 5 9-10",
  shuffle: "M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4M18 4l3 3-3 3M18 14l3 3-3 3",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, label }: { name: IconName; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="var(--live)" />
      <path d="M18.5 5 9 18h6l-2 9 10-13.5h-6.2Z" fill="var(--live-ink)" />
    </svg>
  );
}
