import { click } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import type { TranscriptRaw } from "@antumbra/domain-sessions/rows/transcript.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { TranscriptRawRunRow } from "#views/transcript-raw-run.tsx";

const raw = (seq: number, label: string, payload: string): TranscriptRaw => ({ kind: "raw", label, payload, seq, source: "codex" });

it.glass("a run of unfamiliar provider events reads as one line and keeps its full evidence", function* ({ render }) {
	const payload = JSON.stringify({ result: "unfamiliar evidence", detail: "the complete provider payload" }, null, 2);
	const container = yield* render(
		<TranscriptRawRunRow
			run={{
				entries: [raw(1, "future.event", payload), raw(2, "item.started", "{}"), raw(3, "item.completed", "{}")],
				kind: "rawRun",
				seq: 1,
				source: "codex",
			}}
		/>,
	);
	expect(container.textContent).toContain("codex · 3 raw events");
	expect(container.textContent).not.toContain("future.event");
	expect(container.querySelector("pre")).toBeNull();
	const fold = container.querySelector("button");
	if (fold === null) return yield* Effect.die("Missing provider evidence disclosure");
	yield* click(fold);
	expect(container.textContent).toContain("future.event");
	expect(container.querySelector("pre")?.textContent).toBe(payload);
});

it.glass("a lone provider event says so in the singular", function* ({ render }) {
	const container = yield* render(<TranscriptRawRunRow run={{ entries: [raw(1, "future.event", "{}")], kind: "rawRun", seq: 1, source: "codex" }} />);
	expect(container.textContent).toContain("codex · 1 raw event");
});
