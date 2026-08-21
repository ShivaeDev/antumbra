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

const mount = (): { container: HTMLElement; root: Root } => {
	const container = document.createElement("div");
	return { container, root: createRoot(container) };
};

const render = (root: Root, item: TranscriptItem): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			root.render(<TranscriptRow item={item} />);
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

const press = (container: HTMLElement, label: string): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			Array.from(container.querySelectorAll("button"))
				.find((button) => button.textContent === label)
				?.click();
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

const command = 'cd "/charts" && pnpm ready\npnpm test';

const call: TranscriptItem = {
	input: JSON.stringify({ command, description: "Run the gates" }),
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
		text: "# Soundings\n\nThe eastern shoal is steeper than `charted`.",
	});
	expect(shown).toContain("markdown");
	expect(shown).toContain("<h1>Soundings</h1>");
	expect(shown).toContain("<code>charted</code>");
	expect(shown).toContain("agent");
});

it("reads what a person typed as the Markdown they wrote it in", () => {
	const shown = markup({
		kind: "message",
		role: "user",
		seq: 1,
		text: "## Soundings\n\n- the eastern shoal\n- the western shoal",
	});
	expect(shown).toContain("markdown-typed");
	expect(shown).toContain("<h2>Soundings</h2>");
	expect(shown).toContain("<li>the eastern shoal</li>");
	expect(shown).not.toContain("## Soundings");
	expect(shown).toContain("user");
});

it("keeps a wide code block inside the message that carries it", () => {
	const shown = markup({
		kind: "message",
		role: "agent",
		seq: 2,
		text: "```sh\npnpm ready --filter @antumbra/renderer\n```",
	});
	expect(shown).toContain("<pre>");
	expect(shown).toContain("language-sh");
	expect(shown).not.toContain("```");
});

it("gives thinking and telemetry their own weight rather than a message's", () => {
	expect(
		markup({ kind: "thinking", seq: 2, text: "weighing options" }),
	).toContain("text-muted-foreground");
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
		const { container, root } = mount();
		yield* render(root, { ...call, ok: true, result: "9 steps passed" });
		expect(container.textContent).not.toContain("pnpm ready");

		yield* open(container);

		const shown = container.textContent ?? "";
		expect(shown).toContain("pnpm ready");
		expect(shown).toContain("9 steps passed");
		expect(
			container.querySelector("button")?.getAttribute("aria-expanded"),
		).toBe("true");
		yield* drop(root);
	}),
);

it.effect("shows the command that was run, not the JSON it travelled in", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		yield* render(root, call);

		yield* open(container);

		const shown = container.textContent ?? "";
		expect(shown).toContain(command);
		expect(shown).toContain("command");
		expect(shown).toContain("description");
		expect(shown).not.toContain('\\"');
		expect(shown).not.toContain("\\n");
		yield* drop(root);
	}),
);

it.effect("says how many lines of a long result it is holding back", () =>
	Effect.gen(function* () {
		const lines = Array.from({ length: 60 }, (_, at) => `step ${at + 1}`);
		const { container, root } = mount();
		yield* render(root, { ...call, ok: true, result: lines.join("\n") });

		yield* open(container);

		expect(container.textContent).toContain("Show 20 more lines");
		expect(container.textContent).not.toContain("step 60");

		yield* press(container, "Show 20 more lines");

		expect(container.textContent).toContain("step 60");
		expect(container.textContent).not.toContain("Show 20 more lines");
		yield* drop(root);
	}),
);

it("keeps a path too long for the line inside the card that carries it", () => {
	const path = "/Users/navigator/charts/packages/renderer/src/views/piece.tsx";
	const shown = markup({ ...call, input: JSON.stringify({ file_path: path }) });

	expect(shown).toContain("…/views/piece.tsx");
	expect(shown).toContain("truncate");
	expect(shown).not.toContain("/Users/navigator");
});

it.effect("opens a raw payload the same way a call opens", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		yield* render(root, noise);

		yield* open(container);

		expect(container.textContent).toContain("thread-9");
		yield* drop(root);
	}),
);
