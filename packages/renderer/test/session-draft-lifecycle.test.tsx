import type { Fleet } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { discardMissingSessionDrafts } from "#session-drafts/store.ts";
import { SessionMessage } from "#views/session-message.tsx";

const { sendSessionInput } = vi.hoisted(() => ({ sendSessionInput: vi.fn() }));

vi.mock("#adapters/trpc.ts", () => ({ sendSessionInput }));

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
					canAttachImages: true,
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
			work: [],
		},
	],
	backends: ["scripted"],
	capacities: [],
	diag: { intents: [] },
	repos: [],
	roleSettings: [],
});

const nativeValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;

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
		yield* step(() => root.render(<SessionMessage fleet={fleet(sessionId)} onError={() => undefined} sessionId={sessionId} />));
		return { container, root };
	});

const rewrite = (container: HTMLElement, text: string): void => {
	const input = container.querySelector("textarea");
	if (input === null || nativeValue === undefined) {
		return;
	}
	nativeValue.call(input, text);
	input.dispatchEvent(new Event("input", { bubbles: true }));
};

const send = (container: HTMLElement): void => {
	Array.from(container.querySelectorAll("button"))
		.find((button) => button.textContent === "Send")
		?.click();
};

beforeEach(() => {
	discardMissingSessionDrafts(new Set());
	sendSessionInput.mockReset();
});

it.effect("keeps navigation between session drafts isolated", () =>
	Effect.gen(function* () {
		const first = yield* mounted("session-one");
		yield* step(() => rewrite(first.container, "one course"));
		yield* step(() => first.root.unmount());

		const second = yield* mounted("session-two");
		expect(second.container.querySelector("textarea")?.value).toBe("");
		yield* step(() => rewrite(second.container, "another course"));
		yield* step(() => second.root.unmount());

		const returned = yield* mounted("session-one");
		expect(returned.container.querySelector("textarea")?.value).toBe("one course");
		yield* step(() => returned.root.unmount());
	}),
);

it.effect("failure preserves a draft and success clears only that session", () =>
	Effect.gen(function* () {
		let done: (receipt: { status: "accepted" }) => void = () => undefined;
		let fail: (message: string) => void = () => undefined;
		sendSessionInput.mockImplementation(
			(_request: unknown, onDone: (receipt: { status: "accepted" }) => void, onError: (message: string) => void) => {
				done = onDone;
				fail = onError;
			},
		);
		const first = yield* mounted("session-one");
		yield* step(() => rewrite(first.container, "hold session one"));
		yield* step(() => send(first.container));
		yield* step(() => fail("delivery refused"));
		expect(first.container.querySelector("textarea")?.value).toBe("hold session one");
		yield* step(() => first.root.unmount());

		const second = yield* mounted("session-two");
		yield* step(() => rewrite(second.container, "hold session two"));
		yield* step(() => second.root.unmount());

		const retry = yield* mounted("session-one");
		yield* step(() => send(retry.container));
		yield* step(() => done({ status: "accepted" }));
		expect(retry.container.querySelector("textarea")?.value).toBe("");
		yield* step(() => retry.root.unmount());
		const untouched = yield* mounted("session-two");
		expect(untouched.container.querySelector("textarea")?.value).toBe("hold session two");
		yield* step(() => untouched.root.unmount());
	}),
);

it.effect("a successful send does not erase words typed while it settles", () =>
	Effect.gen(function* () {
		let done: (receipt: { status: "accepted" }) => void = () => undefined;
		sendSessionInput.mockImplementation((_request: unknown, onDone: (receipt: { status: "accepted" }) => void) => {
			done = onDone;
		});
		const composer = yield* mounted("session-race");
		yield* step(() => rewrite(composer.container, "sent words"));
		yield* step(() => send(composer.container));
		yield* step(() => rewrite(composer.container, "next words"));
		yield* step(() => done({ status: "accepted" }));
		expect(composer.container.querySelector("textarea")?.value).toBe("next words");
		yield* step(() => composer.root.unmount());

		const returned = yield* mounted("session-race");
		expect(returned.container.querySelector("textarea")?.value).toBe("next words");
		yield* step(() => returned.root.unmount());
	}),
);

it.effect("a send success clears a composer remounted while it settled", () =>
	Effect.gen(function* () {
		let done: (receipt: { status: "accepted" }) => void = () => undefined;
		sendSessionInput.mockImplementation((_request: unknown, onDone: (receipt: { status: "accepted" }) => void) => {
			done = onDone;
		});
		const first = yield* mounted("session-remounted-send");
		yield* step(() => rewrite(first.container, "words in passage"));
		yield* step(() => send(first.container));
		yield* step(() => first.root.unmount());

		const returned = yield* mounted("session-remounted-send");
		expect(returned.container.querySelector("textarea")?.value).toBe("words in passage");
		yield* step(() => done({ status: "accepted" }));
		expect(returned.container.querySelector("textarea")?.value).toBe("");
		yield* step(() => returned.root.unmount());
	}),
);
