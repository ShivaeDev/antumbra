// @vitest-environment happy-dom

import type { SessionEvent } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { TranscriptView } from "#views/transcript.tsx";

interface Opened {
	readonly onEvent: (event: SessionEvent) => void;
}

const { opened, watchSessionEvents } = vi.hoisted(() => {
	const opened: Array<Opened> = [];
	return {
		opened,
		watchSessionEvents: (_query: unknown, onEvent: Opened["onEvent"]) => {
			opened.push({ onEvent });
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

const called = (seq: number, name: string): ReadonlyArray<SessionEvent> => [
	{
		event: {
			_tag: "Known",
			event: {
				input: "{}",
				name,
				raw: { kind: "wire/kind", payload: "{}", source: "scripted" },
				toolId: `tool-${seq}`,
				type: "tool.started",
			},
		},
		seq,
		sessionId: "session-1",
	},
	{
		event: {
			_tag: "Known",
			event: {
				ok: true,
				output: "done",
				raw: { kind: "wire/kind", payload: "{}", source: "scripted" },
				toolId: `tool-${seq}`,
				type: "tool.completed",
			},
		},
		seq: seq + 1,
		sessionId: "session-1",
	},
];

const react = (action: () => void): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			action();
			return Promise.resolve();
		}),
	);

beforeEach(() => {
	opened.length = 0;
});

it.effect("draws session events as transcript rows", () =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* react(() => root.render(<TranscriptView foldToolCalls={false} sessionId="session-1" />));

		expect(container.textContent).toContain("no events yet");

		yield* react(() => opened[0]?.onEvent(said(0, "raising the anchor")));
		expect(container.textContent).toContain("raising the anchor");
		yield* react(() => root.unmount());
	}),
);

it.effect("lists every call until the admiral asks for them folded", () =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* react(() => root.render(<TranscriptView foldToolCalls={false} sessionId="session-1" />));
		const events = [...called(0, "Read"), ...called(2, "Grep")];
		for (const event of events) {
			yield* react(() => opened[0]?.onEvent(event));
		}

		expect(container.textContent).toContain("Read");
		expect(container.textContent).toContain("Grep");
		expect(container.textContent).not.toContain("called 2 tools");

		yield* react(() => root.render(<TranscriptView foldToolCalls={true} sessionId="session-1" />));

		expect(container.textContent).toContain("called 2 tools");
		expect(opened).toHaveLength(1);
		yield* react(() => root.unmount());
	}),
);
