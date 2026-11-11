"use client";

import {
  VideoTrack,
  isTrackReference,
  useConnectionQualityIndicator,
  useIsMuted,
  useIsSpeaking,
} from "@livekit/components-react";
import { ConnectionQuality, Track } from "livekit-client";
import { Avatar } from "../Avatar";
import { Icon } from "../Icon";

type TrackRef = Parameters<typeof useIsMuted>[0];

export function Tile({ trackRef, screen }: { trackRef: TrackRef; screen?: boolean }) {
  const p = trackRef.participant;
  const speaking = useIsSpeaking(p);
  const videoMuted = useIsMuted(trackRef);
  const micMuted = useIsMuted({ participant: p, source: Track.Source.Microphone, publication: p.getTrackPublication(Track.Source.Microphone) });
  const { quality } = useConnectionQualityIndicator({ participant: p });
  const name = p.name || "Guest";
  const label = screen ? `${name}'s screen` : p.isLocal ? `${name} (you)` : name;
  const showVideo = isTrackReference(trackRef) && !videoMuted;

  const cls = ["tile", p.isLocal && "local", screen && "screen", speaking && !screen && "speaking"].filter(Boolean).join(" ");

  return (
    <div className={cls} data-identity={p.identity}>
      {showVideo ? (
        <VideoTrack trackRef={trackRef} />
      ) : (
        <Avatar name={name} color={p.attributes?.color} size="xl" speaking={speaking} />
      )}
      <div className="label">
        {!screen && (micMuted || !p.getTrackPublication(Track.Source.Microphone)) ? (
          <span className="muted-mic">
            <Icon name="micOff" label="Muted" />
          </span>
        ) : null}
        <span>{label}</span>
        {!screen && !p.isLocal ? <Quality q={quality} /> : null}
      </div>
    </div>
  );
}

function Quality({ q }: { q: ConnectionQuality }) {
  const text =
    q === ConnectionQuality.Excellent ? "excellent" : q === ConnectionQuality.Good ? "good" : q === ConnectionQuality.Poor ? "poor" : "unknown";
  if (text === "unknown") return null;
  return (
    <span className="quality" data-q={text} role="img" aria-label={`Connection ${text}`}>
      <i />
      <i />
      <i />
    </span>
  );
}
