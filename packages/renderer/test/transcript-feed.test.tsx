// why: @vitest-environment happy-dom exercises the real subscription lifecycle.

import type { EventQuery, SessionEvent } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { TranscriptView } from "#views/transcript.tsx";

interface Opened {
	readonly onError: (message: string) => void;
	readonly onEvent: (event: SessionEvent) => void;
	readonly query: EventQuery;
}

const { opened, watchSessionEvents } = vi.hoisted(() => {
	const opened: Array<Opened> = [];
	return {
		opened,
		watchSessionEvents: (
			query: Opened["query"],
			onEvent: Opened["onEvent"],
			onError: Opened["onError"],
		) => {
			opened.push({ onError, onEvent, query });
			return () => undefined;
		},
	};
});

vi.mock("#adapters/trpc.ts", () => ({ watchSessionEvents }));

const said = (seq: number, text: string): SessionEvent => ({
	event: {
		_tag: "Known",
		event: {
			raw: { kind: "wire/kind", payload: "{}", source: "scripted" },
			role: "agent",
			text,
			type: "message",
		},
	},
	seq,
	sessionId: "session-1",
});

const mount = (): { container: HTMLElement; root: Root } => {
	const container = document.createElement("div");
	return { container, root: createRoot(container) };
};

const render = (root: Root, sessionId: string): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			root.render(<TranscriptView sessionId={sessionId} />);
			return Promise.resolve();
		}),
	);

const push = (send: () => void): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			send();
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

beforeEach(() => {
	opened.length = 0;
});

it.effect("keeps every event it was sent, in the order they arrived", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		yield* render(root, "session-1");

		expect(opened[0]?.query).toEqual({ fromSeq: 0, sessionId: "session-1" });
		expect(container.textContent).toContain("no events yet");

		yield* push(() => opened[0]?.onEvent(said(0, "raising the anchor")));
		yield* push(() => opened[0]?.onEvent(said(1, "clearing the harbour")));

		const shown = container.textContent ?? "";
		expect(shown).toContain("raising the anchor");
		expect(shown).toContain("clearing the harbour");
		expect(shown.indexOf("raising the anchor")).toBeLessThan(
			shown.indexOf("clearing the harbour"),
		);
		yield* drop(root);
	}),
);

it.effect("starts an empty transcript when the session changes", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		yield* render(root, "session-1");
		yield* push(() => opened[0]?.onEvent(said(0, "raising the anchor")));

		yield* render(root, "session-2");

		expect(opened[1]?.query).toEqual({ fromSeq: 0, sessionId: "session-2" });
		expect(container.textContent).not.toContain("raising the anchor");
		expect(container.textContent).toContain("no events yet");
		yield* drop(root);
	}),
);

it.effect("says a lost feed and keeps the events it already had", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		yield* render(root, "session-1");
		yield* push(() => opened[0]?.onEvent(said(0, "raising the anchor")));

		yield* push(() => opened[0]?.onError("the bridge closed"));

		expect(container.textContent).toContain("feed lost: the bridge closed");
		expect(container.textContent).toContain("raising the anchor");
		yield* drop(root);
	}),
);
