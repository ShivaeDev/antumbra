// why: @vitest-environment happy-dom exercises the real React typing boundary.

import type { SessionSituation } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";
import { SessionSituations } from "#views/session-situations.tsx";

const { sendToSession, situationDraft } = vi.hoisted(() => ({
	sendToSession: vi.fn(),
	situationDraft: vi.fn(),
}));

vi.mock("#adapters/trpc.ts", () => ({ sendToSession, situationDraft }));

const DRAFT = "Change #42 in Reef-Charts has merge conflicts.";

const conflicts: SessionSituation = {
	changeId: "change-1",
	reference: "#42",
	situation: "merge_conflicts",
};

const reviews: SessionSituation = {
	changeId: "change-2",
	reference: "#43",
	situation: "unresolved_reviews",
};

const controls = (situations: ReadonlyArray<SessionSituation>) => (
	<SessionSituations
		onError={() => undefined}
		sessionId="session-1"
		situations={situations}
	/>
);

const mounted = (situations: ReadonlyArray<SessionSituation>) =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		yield* Effect.promise(() =>
			act(() => {
				root.render(controls(situations));
				return Promise.resolve();
			}),
		);
		return { container, root };
	});

const step = (change: () => void) =>
	Effect.promise(() =>
		act(() => {
			change();
			return Promise.resolve();
		}),
	);

const clickLabelled = (label: string): void => {
	const button = [...document.querySelectorAll("button")].find((candidate) =>
		(candidate.textContent ?? "").includes(label),
	);
	button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
};

const composer = (): HTMLTextAreaElement | null =>
	document.querySelector("textarea");

// why: React tracks the value it last rendered, so an edit has to go through
// the element's own value setter or the change never reaches the component.
const nativeValue = Object.getOwnPropertyDescriptor(
	HTMLTextAreaElement.prototype,
	"value",
)?.set;

const rewrite = (text: string): void => {
	const area = composer();
	if (area === null || nativeValue === undefined) {
		return;
	}
	nativeValue.call(area, text);
	area.dispatchEvent(new Event("input", { bubbles: true }));
};

it("offers a control for each published situation and none otherwise", () => {
	expect(renderToStaticMarkup(controls([]))).toBe("");
	const one = renderToStaticMarkup(controls([conflicts]));
	expect(one).toContain("Resolve conflicts");
	expect(one).toContain("#42");
	expect(one).not.toContain("Answer review comments");
	const both = renderToStaticMarkup(controls([conflicts, reviews]));
	expect(both).toContain("Resolve conflicts");
	expect(both).toContain("Answer review comments");
	expect(both).toContain("#43");
});

it.effect("draws the words from the catalog and sends nothing on its own", () =>
	Effect.gen(function* () {
		sendToSession.mockClear();
		situationDraft.mockClear();
		situationDraft.mockImplementation(
			(_draft: unknown, onDraft: (text: string) => void) => {
				onDraft(DRAFT);
			},
		);
		const { root } = yield* mounted([conflicts]);
		yield* step(() => clickLabelled("Resolve conflicts"));
		expect(situationDraft).toHaveBeenCalledWith(
			{ changeId: "change-1", situation: "merge_conflicts" },
			expect.any(Function),
			expect.any(Function),
		);
		expect(composer()?.value).toBe(DRAFT);
		expect(sendToSession).not.toHaveBeenCalled();
		yield* step(() => root.unmount());
	}),
);

// why: the whole point of the preview is that what leaves is what the admiral
// approved. The draft is a starting point, and an edited one must reach the
// send seam exactly as it was left.
it.effect("sends the edited words verbatim through the ordinary send", () =>
	Effect.gen(function* () {
		sendToSession.mockClear();
		situationDraft.mockImplementation(
			(_draft: unknown, onDraft: (text: string) => void) => {
				onDraft(DRAFT);
			},
		);
		const { root } = yield* mounted([conflicts]);
		yield* step(() => clickLabelled("Resolve conflicts"));
		yield* step(() => rewrite(`${DRAFT} Take the eastern approach.`));
		yield* step(() => clickLabelled("Send"));
		expect(sendToSession).toHaveBeenCalledWith(
			"session-1",
			`${DRAFT} Take the eastern approach.`,
			expect.any(Function),
			expect.any(Function),
		);
		yield* step(() => root.unmount());
	}),
);
