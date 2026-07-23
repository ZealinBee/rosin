import type { Metadata } from "next";
import Accompanist from "./accompanist";

export const metadata: Metadata = {
  title: "Piano Accompanist - Rosin",
  description:
    "Find piano accompaniment and backing tracks for any song to play along with.",
};

export default function AccompanistPage() {
  return (
    <main className="flex flex-1 flex-col items-center px-[var(--sp-5)] py-[var(--sp-10)]">
      <Accompanist />
    </main>
  );
}
