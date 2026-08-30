// why: @vitest-environment happy-dom renders a row the way the pane does.

import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import type { TranscriptToolRun } from "#transcript/fold.ts";
import type { TranscriptTool } from "#transcript/model.ts";
import { TranscriptRow } from "#views/transcript-row.tsx";

const markup = (run: TranscriptToolRun): string =>
	renderToStaticMarkup(<TranscriptRow item={run} />);

const mount = (): { container: HTMLElement; root: Root } => {
	const container = document.createElement("div");
	return { container, root: createRoot(container) };
};

const render = (root: Root, run: TranscriptToolRun): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			root.render(<TranscriptRow item={run} />);
			return Promise.resolve();
		}),
	);

const open = (container: HTMLElement): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			container.querySelector("button")?.click();
			return Promise.resolve();
		}),
	);

const drop = (root: Root): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			root.unmount();
			return Promise.resolve();
		}),
	);

const call: TranscriptTool = {
	input: JSON.stringify({
		command: "pnpm ready",
		description: "Run the gates",
	}),
	kind: "tool",
	name: "Bash",
	ok: undefined,
	result: undefined,
	seq: 3,
};

const run: TranscriptToolRun = {
	entries: [
		{ ...call, ok: true, result: "9 steps passed" },
		{ kind: "thinking", seq: 4, text: "now the chart" },
		{
			input: JSON.stringify({ file_path: "/charts/eastern-shoal.md" }),
			kind: "tool",
			name: "Read",
			ok: true,
			result: "depth 3 fathoms",
			seq: 5,
		},
		{ ...call, input: JSON.stringify({ command: "pnpm lint" }), seq: 6 },
	],
	kind: "toolRun",
	seq: 3,
};

it("says how many calls a run folds and which tools were reached for", () => {
	const shown = markup(run);
	expect(shown).toContain("called 3 tools");
	expect(shown).toContain("Bash ×2, Read");
	expect(shown).toContain("1 still running");
	expect(shown).not.toContain("failed");
	expect(shown).not.toContain("pnpm ready");
});

it("counts a failed call on the folded line rather than hiding it", () => {
	const shown = markup({
		...run,
		entries: [
			{ ...call, ok: false, result: "no such dir" },
			{ ...call, ok: true, result: "9 steps passed", seq: 4 },
		],
	});
	expect(shown).toContain("1 failed");
	expect(shown).not.toContain("still running");
});

it.effect("opens a folded run into the calls it holds, unchanged", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		yield* render(root, run);
		expect(container.textContent).not.toContain("Run the gates");
		expect(container.textContent).not.toContain("now the chart");

		yield* open(container);

		const shown = container.textContent ?? "";
		const labels = Array.from(
			container.querySelectorAll(".grid > span:first-child"),
		).map((label) => label.textContent);
		expect(labels).toEqual(["tools", "tool", "thinking", "tool", "tool"]);
		expect(shown).toContain("Run the gates");
		expect(shown).toContain("now the chart");
		expect(shown).toContain("charts/eastern-shoal.md");
		expect(shown).toContain("running");
		expect(
			container.querySelector("button")?.getAttribute("aria-expanded"),
		).toBe("true");
		yield* drop(root);
	}),
);
