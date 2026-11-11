import { ImageResponse } from "next/og";

export const alt = "Zaproom: rooms with the lights on";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const people = [
  { i: "SA", c: "#FF8A3D" },
  { i: "MK", c: "#3DDC97" },
  { i: "JL", c: "#4CB8FF" },
  { i: "RA", c: "#B18CFF" },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#16122E",
          color: "#F1EDFF",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40, fontWeight: 800 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "#FF8A3D", display: "flex" }} />
          zaproom
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>Rooms with the lights on.</div>
          <div style={{ fontSize: 34, color: "#B9B1DC" }}>Video, voice and chat in your browser. No sign-up.</div>
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          {people.map((p, n) => (
            <div
              key={p.i}
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                background: p.c,
                color: "#16122E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                fontWeight: 800,
                marginLeft: n ? -16 : 0,
                border: n === 0 ? "6px solid #FF8A3D" : "6px solid #16122E",
                boxShadow: n === 0 ? "0 0 0 6px #16122E, 0 0 0 12px #FF8A3D" : "none",
              }}
            >
              {p.i}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
