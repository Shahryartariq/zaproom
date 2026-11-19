"use client";

import dynamic from "next/dynamic";

/**
 * The LiveKit client is the biggest part of the app, so it loads only when someone
 * joins a call or a chat, not with the page. Join forms call `preloadLive()` once the
 * person starts filling them in, so joining still feels instant.
 */
function Connecting() {
  return (
    <div className="state-screen" aria-busy="true">
      <p>Connecting…</p>
    </div>
  );
}

const loadChat = () => import("./chat/ChatApp");
const loadCall = () => import("./room/Call");

export const ChatApp = dynamic(() => loadChat().then((m) => m.ChatApp), { ssr: false, loading: Connecting });
export const Call = dynamic(() => loadCall().then((m) => m.Call), { ssr: false, loading: Connecting });
export const LeaveButton = dynamic(() => import("./room/LeaveButton").then((m) => m.LeaveButton), { ssr: false });

let preloaded = false;
export function preloadLive(): void {
  if (preloaded) return;
  preloaded = true;
  void loadChat().catch(() => (preloaded = false));
  void loadCall().catch(() => (preloaded = false));
}
