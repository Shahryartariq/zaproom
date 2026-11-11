import type { Metadata } from "next";
import { LoungeScreen } from "@/components/chat/LoungeScreen";

export const metadata: Metadata = {
  title: "Chat",
  description: "A global text chat for everyone online, and private one-to-one messages. No sign-up.",
  alternates: { canonical: "/chat" },
};

export default function ChatPage() {
  return <LoungeScreen />;
}
