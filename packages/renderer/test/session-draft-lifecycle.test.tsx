// why: @vitest-environment happy-dom exercises draft lifetime through the real
// controlled session composer.

import type { Fleet } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { discardMissingSessionDrafts } from "#session-drafts/store.ts";
import { SessionMessage } from "#views/session-message.tsx";

const { sendToSession } = vi.hoisted(() => ({ sendToSession: vi.fn() }));

vi.mock("#adapters/trpc.ts", () => ({ sendToSession }));

const fleet = (sessionId: string): Fleet => ({
	agents: [
		{
			berths: [],
			canRetire: false,
			charter: "sound the passage",
			diag: { currentSessionId: sessionId, intents: [] },
			id: `agent-${sessionId}`,
			role: "pilot",
			sessions: [
				{
					addressable: [],
					backend: "scripted",
					canInterrupt: true,
					canSend: true,
					canSleep: false,
					cwd: "/tmp/passage",
					diag: { current: true, execution: "active", intents: [] },
					id: sessionId,
					presence: "working",
					status: "open",
				},
			],
			status: "alive",
		},
	],
	backends: ["scripted"],
	diag: { intents: [] },
	repos: [],
});

const nativeValue = Object.getOwnPropertyDescriptor(
	HTMLInputElement.prototype,
	"value",
)?.set;

const step = (change: () => void) =>
	Effect.promise(() =>
		act(() => {
			change();
			return Promise.resolve();
		}),
	);

const mounted = (sessionId: string) =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* step(() =>
			root.render(
				<SessionMessage
					fleet={fleet(sessionId)}
					onError={() => undefined}
					sessionId={sessionId}
				/>,
			),
		);
		return { container, root };
	});

const rewrite = (container: HTMLElement, text: string): void => {
	const input = container.querySelector("input");
	if (input === null || nativeValue === undefined) {
		return;
	}
	nativeValue.call(input, text);
	input.dispatchEvent(new Event("input", { bubbles: true }));
};

const send = (container: HTMLElement): void => {
	container.querySelector("button")?.click();
};

beforeEach(() => {
	discardMissingSessionDrafts(new Set());
	sendToSession.mockReset();
});

it.effect("keeps navigation between session drafts isolated", () =>
	Effect.gen(function* () {
		const first = yield* mounted("session-one");
		yield* step(() => rewrite(first.container, "one course"));
		yield* step(() => first.root.unmount());

		const second = yield* mounted("session-two");
		expect(second.container.querySelector("input")?.value).toBe("");
		yield* step(() => rewrite(second.container, "another course"));
		yield* step(() => second.root.unmount());

		const returned = yield* mounted("session-one");
		expect(returned.container.querySelector("input")?.value).toBe("one course");
		yield* step(() => returned.root.unmount());
	}),
);

it.effect(
	"failure preserves a draft and success clears only that session",
	() =>
		Effect.gen(function* () {
			let done: () => void = () => undefined;
			let fail: (message: string) => void = () => undefined;
			sendToSession.mockImplementation(
				(
					_sessionId: string,
					_text: string,
					onDone: () => void,
					onError: (message: string) => void,
				) => {
					done = onDone;
					fail = onError;
				},
			);
			const first = yield* mounted("session-one");
			yield* step(() => rewrite(first.container, "hold session one"));
			yield* step(() => send(first.container));
			yield* step(() => fail("delivery refused"));
			expect(first.container.querySelector("input")?.value).toBe(
				"hold session one",
			);
			yield* step(() => first.root.unmount());

			const second = yield* mounted("session-two");
			yield* step(() => rewrite(second.container, "hold session two"));
			yield* step(() => second.root.unmount());

			const retry = yield* mounted("session-one");
			yield* step(() => send(retry.container));
			yield* step(done);
			expect(retry.container.querySelector("input")?.value).toBe("");
			yield* step(() => retry.root.unmount());
			const untouched = yield* mounted("session-two");
			expect(untouched.container.querySelector("input")?.value).toBe(
				"hold session two",
			);
			yield* step(() => untouched.root.unmount());
		}),
);

it.effect("a successful send does not erase words typed while it settles", () =>
	Effect.gen(function* () {
		let done: () => void = () => undefined;
		sendToSession.mockImplementation(
			(_sessionId: string, _text: string, onDone: () => void) => {
				done = onDone;
			},
		);
		const composer = yield* mounted("session-race");
		yield* step(() => rewrite(composer.container, "sent words"));
		yield* step(() => send(composer.container));
		yield* step(() => rewrite(composer.container, "next words"));
		yield* step(done);
		expect(composer.container.querySelector("input")?.value).toBe("next words");
		yield* step(() => composer.root.unmount());

		const returned = yield* mounted("session-race");
		expect(returned.container.querySelector("input")?.value).toBe("next words");
		yield* step(() => returned.root.unmount());
	}),
);

it.effect("a send success clears a composer remounted while it settled", () =>
	Effect.gen(function* () {
		let done: () => void = () => undefined;
		sendToSession.mockImplementation(
			(_sessionId: string, _text: string, onDone: () => void) => {
				done = onDone;
			},
		);
		const first = yield* mounted("session-remounted-send");
		yield* step(() => rewrite(first.container, "words in passage"));
		yield* step(() => send(first.container));
		yield* step(() => first.root.unmount());

		const returned = yield* mounted("session-remounted-send");
		expect(returned.container.querySelector("input")?.value).toBe(
			"words in passage",
		);
		yield* step(done);
		expect(returned.container.querySelector("input")?.value).toBe("");
		yield* step(() => returned.root.unmount());
	}),
);
