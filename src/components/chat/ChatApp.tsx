"use client";

import { LiveKitRoom } from "@livekit/components-react";
import { DisconnectReason } from "livekit-client";
import { useMemo } from "react";
import type { Connection } from "../room/types";
import { ChatShell } from "./ChatShell";
import { useChatEngine } from "./useChatEngine";

type Props = {
  conn: Connection;
  groupName: string;
  groupHint: string;
  storageKey?: string;
  announceJoins: boolean;
  onDisconnected: (reason?: DisconnectReason) => void;
  headerExtra?: React.ReactNode;
};

/** A text-only LiveKit connection: no camera, no microphone, just data packets. */
export function ChatApp({ conn, onDisconnected, ...rest }: Props) {
  const options = useMemo(() => ({ adaptiveStream: false, dynacast: false }), []);
  return (
    <LiveKitRoom
      className="chat-room"
      serverUrl={conn.url}
      token={conn.token}
      connect
      audio={false}
      video={false}
      options={options}
      onDisconnected={onDisconnected}
      onError={(e) => console.error("[chat]", e)}
    >
      <ChatInner {...rest} />
    </LiveKitRoom>
  );
}

function ChatInner({
  groupName,
  groupHint,
  storageKey,
  announceJoins,
  headerExtra,
}: Omit<Props, "conn" | "onDisconnected">) {
  const chat = useChatEngine({ storageKey, groupName, announceJoins });
  return <ChatShell chat={chat} groupName={groupName} groupHint={groupHint} headerExtra={headerExtra} />;
}
