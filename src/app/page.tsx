import Tuner from "./tuner";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-[var(--sp-8)] px-[var(--sp-5)] py-[var(--sp-12)]">
      <Tuner />
    </main>
  );
}
