"use client";

import { useTrackToggle } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "../Icon";
import { REACTIONS } from "./Reactions";
import type { PanelTab } from "./SidePanel";

type Props = {
  voice: boolean;
  panel: PanelTab | null;
  onPanel: (tab: PanelTab) => void;
  unread: number;
  onReact: (emoji: string) => void;
  onLeave: () => void;
  leaveLabel: string;
};

const noop = () => () => {};

export function ControlBar({ voice, panel, onPanel, unread, onReact, onLeave, leaveLabel }: Props) {
  const mic = useTrackToggle({ source: Track.Source.Microphone });
  const cam = useTrackToggle({ source: Track.Source.Camera });
  const screen = useTrackToggle({ source: Track.Source.ScreenShare, captureOptions: { audio: true } });
  const [picker, setPicker] = useState(false);
  // Phones can't share their screen from a browser; hide the button there.
  const canShare = useSyncExternalStore(
    noop,
    () => typeof navigator.mediaDevices?.getDisplayMedia === "function",
    () => false,
  );
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!picker) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !pickerRef.current?.contains(e.target as Node)) setPicker(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [picker]);

  return (
    <div className="controls" role="toolbar" aria-label="Call controls">
      <button
        className="ctl media"
        aria-pressed={mic.enabled}
        disabled={mic.pending}
        onClick={() => void mic.toggle()}
        aria-label={mic.enabled ? "Mute microphone" : "Unmute microphone"}
        title={mic.enabled ? "Mute" : "Unmute"}
      >
        <Icon name={mic.enabled ? "mic" : "micOff"} />
      </button>
      {!voice ? (
        <button
          className="ctl media"
          aria-pressed={cam.enabled}
          disabled={cam.pending}
          onClick={() => void cam.toggle()}
          aria-label={cam.enabled ? "Turn camera off" : "Turn camera on"}
          title={cam.enabled ? "Camera off" : "Camera on"}
        >
          <Icon name={cam.enabled ? "cam" : "camOff"} />
        </button>
      ) : null}
      {canShare ? (
        <button
          className="ctl toggle"
          aria-pressed={screen.enabled}
          disabled={screen.pending}
          onClick={() => void screen.toggle()}
          aria-label={screen.enabled ? "Stop sharing your screen" : "Share your screen"}
          title={screen.enabled ? "Stop sharing" : "Share screen"}
        >
          <Icon name="screen" />
        </button>
      ) : null}
      <div ref={pickerRef} className="picker-wrap">
        <button
          className="ctl toggle"
          aria-pressed={picker}
          aria-haspopup="true"
          aria-expanded={picker}
          onClick={() => setPicker((v) => !v)}
          aria-label="Send a reaction"
          title="React"
        >
          <Icon name="smile" />
        </button>
        {picker ? (
          <div className="reaction-picker" role="group" aria-label="Reactions">
            {REACTIONS.map((r) => (
              <button
                key={r.emoji}
                aria-label={r.label}
                onClick={() => {
                  onReact(r.emoji);
                  setPicker(false);
                }}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <button
        className="ctl toggle"
        aria-pressed={panel === "chat"}
        onClick={() => onPanel("chat")}
        aria-label={unread ? `Chat, ${unread} unread` : "Chat"}
        title="Chat"
      >
        <Icon name="chat" />
        {unread ? <span className="badge" aria-hidden="true">{unread > 9 ? "9+" : unread}</span> : null}
      </button>
      <button
        className="ctl toggle"
        aria-pressed={panel === "people"}
        onClick={() => onPanel("people")}
        aria-label="People"
        title="People"
      >
        <Icon name="people" />
      </button>
      <button className="ctl leave" onClick={onLeave}>
        <Icon name="leave" />
        {leaveLabel}
      </button>
    </div>
  );
}
