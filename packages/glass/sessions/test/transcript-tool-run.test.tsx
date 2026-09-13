import { click, press } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { Effect } from "effect";
import { expect } from "vitest";
import type { TranscriptToolRun } from "#transcript/fold.ts";
import { TranscriptToolRunRow } from "#views/transcript-tool-run.tsx";

const run: TranscriptToolRun = {
	kind: "toolRun",
	seq: 3,
	entries: [
		{ kind: "tool", seq: 3, name: "Bash", input: JSON.stringify({ command: "pnpm ready" }), result: "9 steps passed", ok: true },
		{ kind: "thinking", seq: 4, text: "now the chart" },
		{ kind: "tool", seq: 5, name: "Read", input: JSON.stringify({ file_path: "/charts/eastern-shoal.md" }), result: "depth 3 fathoms", ok: true },
		{ kind: "tool", seq: 6, name: "Bash", input: JSON.stringify({ command: "pnpm lint" }), result: undefined, ok: undefined },
	],
};

const opens = (container: HTMLElement, name: string): HTMLButtonElement | undefined =>
	[...container.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.startsWith(name));

it.glass("folded calls keep their running state and reveal each result", function* ({ render }) {
	const container = yield* render(<TranscriptToolRunRow live run={run} />);
	expect(container.textContent).not.toContain("depth 3 fathoms");
	yield* press(container, "3 tool calls · 1 still running");
	expect(container.textContent).toContain("now the chart");
	const read = opens(container, "Read");
	if (read === undefined) return yield* Effect.die("Missing Read disclosure");
	yield* click(read);
	expect(container.textContent).toContain("depth 3 fathoms");
});

it.glass("a folded failed call remains visible while stopped work says unfinished", function* ({ render }) {
	const failed: TranscriptToolRun = {
		...run,
		entries: [
			{ kind: "tool", seq: 1, name: "Read", input: "{}", result: "no such file", ok: false },
			{ kind: "tool", seq: 2, name: "Bash", input: "{}", result: undefined, ok: undefined },
		],
	};
	const container = yield* render(<TranscriptToolRunRow live={false} run={failed} />);
	expect([...container.querySelectorAll("button")].map((fold) => fold.textContent)).toEqual(["2 tool calls · 1 unfinished · 1 failed"]);
});
