// why: @vitest-environment happy-dom renders a row the way the pane does.

import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import type { TranscriptItem } from "#transcript/model.ts";
import { TranscriptRow } from "#views/transcript-row.tsx";

const markup = (item: TranscriptItem): string =>
	renderToStaticMarkup(<TranscriptRow item={item} />);

const mount = (item: TranscriptItem): Effect.Effect<[HTMLElement, Root]> =>
	Effect.promise(async () => {
		const container = document.createElement("div");
		const root = createRoot(container);
		await act(() => {
			root.render(<TranscriptRow item={item} />);
			return Promise.resolve();
		});
		return [container, root];
	});

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

const call: TranscriptItem = {
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

const payload = JSON.stringify({ status: "running", thread: "thread-9" });

const noise: TranscriptItem = {
	kind: "raw",
	label: "codex thread/status/changed",
	payload,
	seq: 4,
};

it("renders what the agent wrote as the Markdown it authored", () => {
	const shown = markup({
		kind: "message",
		role: "agent",
		seq: 0,
		text: "# Soundings\n\nThe eastern shoal is steeper than charted.",
	});
	expect(shown).toContain("markdown");
	expect(shown).toContain("<h1>Soundings</h1>");
	expect(shown).toContain("agent");
});

it("keeps what a person typed exactly as they typed it", () => {
	const shown = markup({
		kind: "message",
		role: "user",
		seq: 1,
		text: "# not a heading",
	});
	expect(shown).toContain("# not a heading");
	expect(shown).not.toContain("<h1");
	expect(shown).toContain("user");
});

it("gives thinking and telemetry their own weight rather than a message's", () => {
	expect(markup({ kind: "thinking", seq: 2, text: "weighing options" })).toContain(
		"text-muted-foreground",
	);
	const divider = markup({
		kind: "telemetry",
		label: "turn completed · 2.3s",
		seq: 3,
	});
	expect(divider).toContain("turn completed · 2.3s");
	expect(divider).toContain("separator");
});

it("states a call in one line and holds its input back until asked", () => {
	const shown = markup(call);
	expect(shown).toContain("Bash");
	expect(shown).toContain("Run the gates");
	expect(shown).toContain("running");
	expect(shown).not.toContain("pnpm ready");
});

it("marks a call that failed and stays quiet about one that did not", () => {
	expect(markup({ ...call, ok: false, result: "no such dir" })).toContain(
		"failed",
	);
	expect(markup({ ...call, ok: true, result: "9 steps passed" })).not.toContain(
		"failed",
	);
});

it("summarises a raw payload and keeps every byte of it one click away", () => {
	const shown = markup(noise);
	expect(shown).toContain("codex thread/status/changed");
	expect(shown).not.toContain("thread-9");
});

it.effect("opens a call on the reader's word, input and result together", () =>
	Effect.gen(function* () {
		const [container, root] = yield* mount({
			...call,
			ok: true,
			result: "9 steps passed",
		});
		expect(container.textContent).not.toContain("pnpm ready");

		yield* open(container);

		const shown = container.textContent ?? "";
		expect(shown).toContain("pnpm ready");
		expect(shown).toContain("9 steps passed");
		expect(container.querySelector("button")?.getAttribute("aria-expanded")).toBe(
			"true",
		);
		yield* drop(root);
	}),
);

it.effect("opens a raw payload the same way a call opens", () =>
	Effect.gen(function* () {
		const [container, root] = yield* mount(noise);

		yield* open(container);

		expect(container.textContent).toContain("thread-9");
		yield* drop(root);
	}),
);
