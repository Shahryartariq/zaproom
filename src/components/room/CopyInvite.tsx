"use client";

import { useState } from "react";
import { Icon } from "../Icon";

export function CopyInvite({ roomId }: { roomId: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${location.origin}/r/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button className="btn ghost" onClick={copy} aria-live="polite">
      <Icon name={copied ? "check" : "link"} />
      <span className="text">{copied ? "Link copied" : "Copy invite link"}</span>
    </button>
  );
}
