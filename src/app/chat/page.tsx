import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { LoungeScreen } from "@/components/chat/LoungeScreen";

export const metadata: Metadata = pageMeta({
  path: "/chat",
  title: "Free online chat and private messages",
  description:
    "Chat with everyone online in one global group, or tap a name for a private one-to-one chat. Free, no sign-up, nothing to install.",
});

export default function ChatPage() {
  return <LoungeScreen />;
}
