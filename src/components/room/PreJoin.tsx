"use client";

import { useCallback, useEffect, useId, useState, useSyncExternalStore } from "react";
import { Avatar } from "../Avatar";
import { Icon } from "../Icon";
import { preloadLive } from "../live";
import { ProfileFields } from "../ProfileFields";
import { useProfileDraft } from "../useProfileDraft";
import type { Connection, MediaChoices, RoomInfo } from "./types";

type Props = {
  info: RoomInfo;
  onJoin: (conn: Connection, media: MediaChoices) => void;
};

export function PreJoin({ info, onJoin }: Props) {
  const id = useId();
  const draft = useProfileDraft();
  const voice = info.kind === "voice";
  const { bindVideo, ...media } = useLocalPreview(!voice);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    const profile = draft.commit();
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roomId: info.id, ...profile }),
      });
      const data = (await res.json()) as Partial<Connection> & { error?: string };
      if (!res.ok || !data.token || !data.url) throw new Error(data.error ?? "Couldn't join the room.");
      const choices = media.choices();
      media.stop();
      onJoin({ token: data.token, url: data.url }, choices);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join the room.");
      setBusy(false);
    }
  }

  const inside = info.count === 0 ? "Nobody's here yet" : `${info.count} ${info.count === 1 ? "person" : "people"} inside`;

  return (
    <form className="prejoin" onSubmit={join} onFocus={preloadLive} onPointerEnter={preloadLive} noValidate>
      <div className="preview" aria-label="Your preview">
        {!voice && media.videoOn ? (
          <video ref={bindVideo} autoPlay playsInline muted />
        ) : (
          <Avatar name={draft.name || "?"} color={draft.color} size="xl" />
        )}
        <div className="meter" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <i key={i} className={media.audioOn && media.level > i * 0.16 + 0.04 ? "on" : undefined} />
          ))}
        </div>
        <div className="preview-bar">
          <button
            type="button"
            className="ctl media"
            aria-pressed={media.audioOn}
            onClick={media.toggleAudio}
            aria-label={media.audioOn ? "Turn microphone off" : "Turn microphone on"}
          >
            <Icon name={media.audioOn ? "mic" : "micOff"} />
          </button>
          {!voice ? (
            <button
              type="button"
              className="ctl media"
              aria-pressed={media.videoOn}
              onClick={media.toggleVideo}
              aria-label={media.videoOn ? "Turn camera off" : "Turn camera on"}
            >
              <Icon name={media.videoOn ? "cam" : "camOff"} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="prejoin-side">
        <div className="room-facts">
          <span className="chip">
            <Icon name={info.visibility === "public" ? "globe" : "lock"} />
            {info.visibility === "public" ? "Listed in lobby" : "Link only"}
          </span>
          <span className="chip">
            <Icon name={voice ? "wave" : "cam"} />
            {voice ? "Voice room" : "Video room"}
          </span>
          <span className="chip">
            <Icon name="people" />
            {inside}
          </span>
        </div>
        <h1>{info.title}</h1>
        {info.topic ? <p className="hint">{info.topic}</p> : null}

        <ProfileFields
          name={draft.name}
          color={draft.color}
          onName={draft.setName}
          onColor={draft.setColor}
          error={draft.error}
          autoFocus={draft.ready && !draft.name}
        />

        {media.devices.audio.length > 0 || media.devices.video.length > 0 ? (
          <div className="device-row">
            <label className="field" htmlFor={`${id}-mic`}>
              <span>Microphone</span>
              <select
                id={`${id}-mic`}
                className="input"
                value={media.audioDeviceId}
                onChange={(e) => media.setAudioDevice(e.target.value)}
              >
                {media.devices.audio.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Microphone ${i + 1}`}
                  </option>
                ))}
              </select>
            </label>
            {!voice ? (
              <label className="field" htmlFor={`${id}-cam`}>
                <span>Camera</span>
                <select
                  id={`${id}-cam`}
                  className="input"
                  value={media.videoDeviceId}
                  onChange={(e) => media.setVideoDevice(e.target.value)}
                >
                  {media.devices.video.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}

        {media.problem ? <p className="hint">{media.problem}</p> : null}
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <button className="btn primary big" type="submit" disabled={busy}>
          {busy ? "Joining…" : "Join room"}
        </button>
      </div>
    </form>
  );
}

type Devices = { audio: MediaDeviceInfo[]; video: MediaDeviceInfo[] };
const noop = () => () => {};

/** Camera preview and mic level before joining. Everything stops when the call starts. */
function useLocalPreview(wantVideo: boolean) {
  const supported = useSyncExternalStore(noop, () => Boolean(navigator.mediaDevices?.getUserMedia), () => true);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(wantVideo);
  const [captured, setCaptured] = useState<MediaStream | null>(null);
  const [level, setLevel] = useState(0);
  const [devices, setDevices] = useState<Devices>({ audio: [], video: [] });
  const [audioDeviceId, setAudioDevice] = useState("");
  const [videoDeviceId, setVideoDevice] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const wanted = supported && (audioOn || videoOn);
  const stream = wanted ? captured : null;

  useEffect(() => {
    if (!wanted) return;
    let cancelled = false;
    let current: MediaStream | null = null;
    const constraints: MediaStreamConstraints = {
      audio: audioOn ? (audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true) : false,
      video: videoOn ? (videoDeviceId ? { deviceId: { exact: videoDeviceId } } : { width: 1280, height: 720 }) : false,
    };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(async (s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        current = s;
        setCaptured(s);
        setFailure(null);
        const list = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        setDevices({
          audio: list.filter((d) => d.kind === "audioinput"),
          video: list.filter((d) => d.kind === "videoinput"),
        });
        const a = s.getAudioTracks()[0]?.getSettings().deviceId;
        const v = s.getVideoTracks()[0]?.getSettings().deviceId;
        if (a) setAudioDevice((cur) => cur || a);
        if (v) setVideoDevice((cur) => cur || v);
      })
      .catch((err: DOMException) => {
        if (cancelled) return;
        setCaptured(null);
        if (err.name === "NotAllowedError") {
          setFailure("Camera and microphone are blocked. Allow them in your browser's site settings, or join and listen.");
          setVideoOn(false);
          setAudioOn(false);
        } else if (err.name === "NotFoundError") {
          setFailure("No camera or microphone found. You can still join, listen and chat.");
          setVideoOn(false);
          setAudioOn(false);
        } else {
          setFailure("Your camera or microphone is busy in another app. Close it there, or join without it.");
          setVideoOn(false);
        }
      });
    return () => {
      cancelled = true;
      current?.getTracks().forEach((t) => t.stop());
    };
  }, [wanted, audioOn, videoOn, audioDeviceId, videoDeviceId]);

  // Mic level meter.
  const micTrack = stream?.getAudioTracks()[0] ?? null;
  useEffect(() => {
    if (!micTrack) return;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(new MediaStream([micTrack])).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let raf = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
      setLevel(Math.min(1, peak / 64));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      void ctx.close();
    };
  }, [micTrack]);

  const bindVideo = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el && el.srcObject !== stream) el.srcObject = stream;
    },
    [stream],
  );

  return {
    audioOn,
    videoOn: videoOn && Boolean(stream?.getVideoTracks().length),
    stream,
    level: micTrack ? level : 0,
    devices,
    audioDeviceId,
    videoDeviceId,
    problem: supported
      ? failure
      : "This browser can't use a camera or microphone here. Try Chrome, Edge, Firefox or Safari over HTTPS.",
    bindVideo,
    toggleAudio: () => setAudioOn((v) => !v),
    toggleVideo: () => setVideoOn((v) => !v),
    setAudioDevice,
    setVideoDevice,
    stop: () => stream?.getTracks().forEach((t) => t.stop()),
    choices: (): MediaChoices => ({
      audio: audioOn,
      video: videoOn,
      audioDeviceId: audioDeviceId || undefined,
      videoDeviceId: videoDeviceId || undefined,
    }),
  };
}
