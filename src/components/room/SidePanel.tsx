"use client";

import { useChat, useParticipants, useIsSpeaking } from "@livekit/components-react";
import { Track, type Participant } from "livekit-client";
import { useEffect, useId, useRef, useState } from "react";
import { countMessage } from "@/lib/activity";
import { isEmojiOnly } from "@/lib/emoji";
import { Avatar } from "../Avatar";
import { EmojiPicker, useEmojiInsert } from "../chat/EmojiPicker";
import { Icon } from "../Icon";

export type PanelTab = "chat" | "people";
type ChatApi = ReturnType<typeof useChat>;

export function SidePanel({
  tab,
  onTab,
  onClose,
  chat,
}: {
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
  onClose: () => void;
  chat: ChatApi;
}) {
  const id = useId();
  const participants = useParticipants();
  return (
    <aside className="panel-side" aria-label="Chat and people">
      <div className="tabs" role="tablist">
        <button role="tab" id={`${id}-chat`} aria-selected={tab === "chat"} aria-controls={`${id}-chat-panel`} onClick={() => onTab("chat")}>
          Chat
        </button>
        <button role="tab" id={`${id}-people`} aria-selected={tab === "people"} aria-controls={`${id}-people-panel`} onClick={() => onTab("people")}>
          People ({participants.length})
        </button>
        <button className="btn ghost close" onClick={onClose} aria-label="Close panel">
          <Icon name="close" />
        </button>
      </div>
      {tab === "chat" ? (
        <div role="tabpanel" id={`${id}-chat-panel`} aria-labelledby={`${id}-chat`} className="chat">
          <Chat chat={chat} />
        </div>
      ) : (
        <div role="tabpanel" id={`${id}-people-panel`} aria-labelledby={`${id}-people`} className="chat">
          <ul className="people">
            {participants.map((p) => (
              <Person key={p.identity} p={p} />
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

function Person({ p }: { p: Participant }) {
  const speaking = useIsSpeaking(p);
  const mic = p.getTrackPublication(Track.Source.Microphone);
  const cam = p.getTrackPublication(Track.Source.Camera);
  return (
    <li>
      <Avatar name={p.name || "Guest"} color={p.attributes?.color} size="s" speaking={speaking} />
      <span>{p.name || "Guest"}</span>
      {p.isLocal ? <em>you</em> : null}
      <Icon name={mic && !mic.isMuted ? "mic" : "micOff"} label={mic && !mic.isMuted ? "Mic on" : "Muted"} />
      <Icon name={cam && !cam.isMuted ? "cam" : "camOff"} label={cam && !cam.isMuted ? "Camera on" : "Camera off"} />
    </li>
  );
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

function Chat({ chat }: { chat: ChatApi }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const addEmoji = useEmojiInsert(inputRef, text, setText, 1000);
  const { chatMessages, send, isSending } = chat;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages.length]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const message = text.trim();
    if (!message) return;
    if (message.length > 1000) return setError("Keep messages under 1,000 characters.");
    try {
      await send(message);
      countMessage();
      setText("");
      setError(null);
    } catch {
      setError("Message didn't send. Check your connection and try again.");
    }
  }

  return (
    <>
      <ol className="messages" ref={listRef} aria-live="polite" aria-label="Messages">
        {chatMessages.length === 0 ? (
          <li className="chat-empty">Messages are seen by everyone in the room and disappear when it closes.</li>
        ) : (
          chatMessages.map((m, i) => {
            const prev = chatMessages[i - 1];
            const sameAuthor = prev && prev.from?.identity === m.from?.identity && m.timestamp - prev.timestamp < 120_000;
            const name = m.from?.isLocal ? "You" : m.from?.name || "Someone";
            if (sameAuthor) {
              return (
                <li key={m.id} className="msg cont">
                  <p className={isEmojiOnly(m.message) ? "big-emoji" : undefined}>{m.message}</p>
                </li>
              );
            }
            return (
              <li key={m.id} className="msg">
                <Avatar name={m.from?.name || "?"} color={m.from?.attributes?.color} size="s" />
                <header>
                  <strong>{name}</strong>
                  <time dateTime={new Date(m.timestamp).toISOString()}>{timeFmt.format(m.timestamp)}</time>
                </header>
                <p className={isEmojiOnly(m.message) ? "big-emoji" : undefined}>{m.message}</p>
              </li>
            );
          })
        )}
      </ol>
      <form className="composer" onSubmit={submit}>
        <EmojiPicker onPick={addEmoji} />
        <label className="sr-only" htmlFor="chat-input">
          Message
        </label>
        <textarea
          id="chat-input"
          ref={inputRef}
          className="input"
          rows={1}
          value={text}
          maxLength={1000}
          placeholder="Write a message"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
          aria-describedby={error ? "chat-error" : undefined}
        />
        <button className="btn primary" type="submit" disabled={isSending || !text.trim()} aria-label="Send message">
          <Icon name="send" />
        </button>
      </form>
      {error ? (
        <p className="form-error" id="chat-error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
