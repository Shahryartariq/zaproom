"use client";

import { useId } from "react";
import { AVATAR_COLORS, type AvatarColorId } from "@/lib/profile";
import { Avatar } from "./Avatar";

type Props = {
  name: string;
  color: AvatarColorId;
  onName: (name: string) => void;
  onColor: (color: AvatarColorId) => void;
  error?: string | null;
  autoFocus?: boolean;
};

/** Name + colour inputs, shared by the lobby, pre-join and stranger screens. */
export function ProfileFields({ name, color, onName, onColor, error, autoFocus }: Props) {
  const id = useId();
  return (
    <>
      <div className="you">
        <Avatar name={name || "?"} color={color} size="l" />
        <label className="field" htmlFor={`${id}-name`}>
          <span>Your name</span>
          <input
            id={`${id}-name`}
            className="input"
            value={name}
            onChange={(e) => onName(e.target.value)}
            maxLength={24}
            autoComplete="nickname"
            placeholder="What should people call you?"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-err` : undefined}
            autoFocus={autoFocus}
            required
          />
        </label>
      </div>
      {error ? (
        <p className="form-error" id={`${id}-err`} role="alert">
          {error}
        </p>
      ) : null}
      <fieldset className="choice-group">
        <legend>Colour</legend>
        <div className="swatches">
          {AVATAR_COLORS.map((c) => (
            <span key={c.id} className={`c-${c.id}`}>
              <input
                type="radio"
                id={`${id}-${c.id}`}
                name={`${id}-color`}
                value={c.id}
                checked={color === c.id}
                onChange={() => onColor(c.id)}
              />
              <label htmlFor={`${id}-${c.id}`}>
                <span className="sr-only">{c.label}</span>
              </label>
            </span>
          ))}
        </div>
      </fieldset>
    </>
  );
}
