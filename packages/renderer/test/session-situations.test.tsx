import type { SessionSituation } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, vi } from "vitest";
import { RendererRequestError } from "#adapters/request-error.ts";
import { discardMissingSessionDrafts } from "#session-drafts/store.ts";
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
	<SessionSituations onError={() => undefined} sessionId="session-1" situations={situations} />
);

const mounted = (situations: ReadonlyArray<SessionSituation>) =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		yield* Effect.addFinalizer(() =>
			step(() => {
				root.unmount();
				container.remove();
			}),
		);
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
	const button = [...document.querySelectorAll("button")].find((candidate) => (candidate.textContent ?? "").includes(label));
	button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
};

const composer = (): HTMLTextAreaElement | null => document.querySelector("textarea");

const nativeValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;

const rewrite = (text: string): void => {
	const area = composer();
	if (area === null || nativeValue === undefined) {
		return;
	}
	nativeValue.call(area, text);
	area.dispatchEvent(new Event("input", { bubbles: true }));
};

beforeEach(() => {
	discardMissingSessionDrafts(new Set());
	sendToSession.mockReset();
	sendToSession.mockReturnValue(Effect.void);
	situationDraft.mockReset();
});

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
		situationDraft.mockImplementation((_draft: unknown, onDraft: (text: string) => void) => {
			onDraft(DRAFT);
		});
		const { root } = yield* mounted([conflicts]);
		yield* step(() => clickLabelled("Resolve conflicts"));
		expect(situationDraft.mock.calls.at(0)?.at(0)).toEqual({ changeId: "change-1", situation: "merge_conflicts" });
		expect(composer()?.value).toBe(DRAFT);
		expect(sendToSession).not.toHaveBeenCalled();
		yield* step(() => root.unmount());
	}),
);

it.effect("sends the edited words verbatim through the ordinary send", () =>
	Effect.gen(function* () {
		sendToSession.mockClear();
		situationDraft.mockImplementation((_draft: unknown, onDraft: (text: string) => void) => {
			onDraft(DRAFT);
		});
		const { root } = yield* mounted([conflicts]);
		yield* step(() => clickLabelled("Resolve conflicts"));
		yield* step(() => rewrite(`${DRAFT} Take the eastern approach.`));
		yield* step(() => clickLabelled("Send"));
		expect(sendToSession).toHaveBeenCalledWith("session-1", `${DRAFT} Take the eastern approach.`);
		yield* step(() => root.unmount());
	}),
);

it.effect("keeps an edited situation draft when the dialog is cancelled", () =>
	Effect.gen(function* () {
		situationDraft.mockImplementation((_draft: unknown, onDraft: (text: string) => void) => {
			onDraft(DRAFT);
		});
		const { root } = yield* mounted([conflicts]);
		yield* step(() => clickLabelled("Resolve conflicts"));
		yield* step(() => rewrite(`${DRAFT} Keep this edit.`));
		yield* step(() => clickLabelled("Cancel"));
		yield* step(() => clickLabelled("Resolve conflicts"));
		expect(composer()?.value).toBe(`${DRAFT} Keep this edit.`);
		yield* step(() => root.unmount());
	}),
);

it.effect("preserves a failed situation send and clears it on success", () =>
	Effect.gen(function* () {
		const failed = yield* Deferred.make<void, RendererRequestError>();
		const accepted = yield* Deferred.make<void>();
		situationDraft.mockImplementation((_draft: unknown, onDraft: (text: string) => void) => {
			onDraft(DRAFT);
		});
		sendToSession.mockReturnValueOnce(Deferred.await(failed));
		sendToSession.mockReturnValueOnce(Deferred.await(accepted));
		const { root } = yield* mounted([conflicts]);
		yield* step(() => clickLabelled("Resolve conflicts"));
		yield* step(() => rewrite(`${DRAFT} Keep this until sent.`));
		yield* step(() => clickLabelled("Send"));
		yield* step(() => {
			Effect.runSync(Deferred.fail(failed, new RendererRequestError({ message: "delivery refused" })));
		});
		expect(composer()?.value).toBe(`${DRAFT} Keep this until sent.`);
		yield* step(() => clickLabelled("Send"));
		yield* step(() => {
			Effect.runSync(Deferred.succeed(accepted, undefined));
		});
		yield* step(() => clickLabelled("Resolve conflicts"));
		expect(composer()?.value).toBe(DRAFT);
		yield* step(() => root.unmount());
	}),
);
