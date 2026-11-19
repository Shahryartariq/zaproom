"use client";

import { useRoomContext } from "@livekit/components-react";
import { Icon } from "../Icon";

export function LeaveButton() {
  const room = useRoomContext();
  return (
    <button className="btn danger" onClick={() => void room.disconnect()}>
      <Icon name="leave" />
      <span className="text">Leave</span>
    </button>
  );
}
