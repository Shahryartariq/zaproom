export type RoomInfo = {
  id: string;
  title: string;
  topic: string;
  kind: "video" | "voice" | "text";
  visibility: "public" | "private" | "stranger";
  count: number;
};

export type MediaChoices = {
  audio: boolean;
  video: boolean;
  audioDeviceId?: string;
  videoDeviceId?: string;
};

export type Connection = { token: string; url: string };
