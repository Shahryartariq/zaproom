import type { Metadata } from "next";
import { StrangerScreen } from "@/components/strangers/StrangerScreen";

export const metadata: Metadata = {
  title: "Meet a stranger",
  description: "Get matched with a random person for a one-to-one video or voice chat. Camera starts off. Skip any time.",
  alternates: { canonical: "/strangers" },
};

export default function StrangersPage() {
  return <StrangerScreen />;
}
