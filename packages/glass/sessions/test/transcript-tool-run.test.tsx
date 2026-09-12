import { click } from "@antumbra/app-testing/glass/dom.ts";
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

it.glass("folded calls keep their running state and reveal each result", function* ({ render }) {
	const container = yield* render(<TranscriptToolRunRow live run={run} />);
	expect(container.textContent).toContain("called 3 tools");
	expect(container.textContent).toContain("Bash ×2, Read");
	expect(container.textContent).toContain("1 still running");
	expect(container.textContent).not.toContain("depth 3 fathoms");
	const folded = container.querySelector<HTMLButtonElement>('button[title="Show these calls"]');
	if (folded === null) return yield* Effect.die("Missing folded calls disclosure");
	yield* click(folded);
	expect(container.textContent).toContain("now the chart");
	const read = [...container.querySelectorAll<HTMLButtonElement>('button[title="Show this call"]')].find((button) =>
		button.textContent?.startsWith("Read"),
	);
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
	expect(container.textContent).toContain("1 failed");
	expect(container.textContent).toContain("1 unfinished");
});
