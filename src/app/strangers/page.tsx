import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { StrangerScreen } from "@/components/strangers/StrangerScreen";

export const metadata: Metadata = pageMeta({
  path: "/strangers",
  title: "Talk to strangers: random video and voice chat",
  description:
    "Get matched with a random person for a one-to-one video or voice chat. Your camera starts off and you can skip any time. Free, no sign-up.",
});

export default function StrangersPage() {
  return <StrangerScreen />;
}
