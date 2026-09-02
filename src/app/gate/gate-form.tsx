"use client";

import { useState } from "react";
import { brand } from "@/lib/brand";
import { acceptTerms } from "./actions";

const CHECKS = [
  {
    id: "age",
    render: () => (
      <>
        I am at least{" "}
        <strong className="font-semibold">{brand.minimumAge} years of age</strong>.
      </>
    ),
  },
  {
    id: "researcher",
    render: () => (
      <>
        I confirm I am a <strong className="font-semibold">qualified researcher</strong>{" "}
        purchasing for{" "}
        <strong className="font-semibold">in vitro / laboratory research</strong>{" "}
        only — not for human or veterinary use.
      </>
    ),
  },
] as const;

export function GateForm({ destination }: { destination: string }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState(false);

  const allChecked = CHECKS.every((check) => checked[check.id]);

  return (
    <form
      action={acceptTerms}
      onSubmit={() => setPending(true)}
      className="mt-6 space-y-4"
    >
      <input type="hidden" name="destination" value={destination} />

      {CHECKS.map((check) => (
        <label
          key={check.id}
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink-200 bg-white px-4 py-3 transition hover:border-copper-400 hover:bg-copper-50/40 has-checked:border-copper-500 has-checked:bg-copper-50/60"
        >
          <input
            type="checkbox"
            checked={Boolean(checked[check.id])}
            onChange={(event) =>
              setChecked((previous) => ({
                ...previous,
                [check.id]: event.target.checked,
              }))
            }
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 accent-copper-600"
          />
          <span className="text-sm leading-relaxed text-ink-800">{check.render()}</span>
        </label>
      ))}

      <button
        type="submit"
        disabled={!allChecked || pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400"
      >
        {pending ? "Entering…" : `Enter ${brand.name}`}
        {!pending && (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12h15M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </form>
  );
}
