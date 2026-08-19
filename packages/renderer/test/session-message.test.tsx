// why: @vitest-environment happy-dom exercises the real React typing boundary.

import type { Fleet } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";
import { SessionMessage } from "#views/session-message.tsx";

const { sendToSession } = vi.hoisted(() => ({ sendToSession: vi.fn() }));

vi.mock("#adapters/trpc.ts", () => ({ sendToSession }));

const fleetWith = (canSend: boolean, status: string): Fleet => ({
	agents: [
		{
			berths: [],
			charter: "chart the reef",
			id: "agent-1",
			role: "navigator",
			sessions: [
				{
					backend: "scripted",
					canInterrupt: canSend,
					canSend,
					cwd: "/tmp/reef",
					id: "session-1",
					status,
				},
			],
			status: "alive",
		},
	],
	backends: ["scripted"],
	repos: [],
});

const box = (fleet: Fleet | undefined) => (
	<SessionMessage
		fleet={fleet}
		onError={() => undefined}
		sessionId="session-1"
	/>
);

// why: React tracks the value it last rendered, so typing has to go through
// the element's own value setter or the change never reaches the component.
const nativeValue = Object.getOwnPropertyDescriptor(
	HTMLInputElement.prototype,
	"value",
)?.set;

const write = (container: HTMLElement, text: string): void => {
	const input = container.querySelector("input");
	if (input === null || nativeValue === undefined) {
		return;
	}
	nativeValue.call(input, text);
	input.dispatchEvent(new Event("input", { bubbles: true }));
};

const pressEnter = (container: HTMLElement): void => {
	container
		.querySelector("input")
		?.dispatchEvent(
			new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }),
		);
};

const mounted = (fleet: Fleet | undefined) =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* Effect.promise(() =>
			act(() => {
				root.render(box(fleet));
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

it("names why a session cannot be spoken to instead of going quiet", () => {
	const listening = renderToStaticMarkup(box(fleetWith(true, "open")));
	expect(listening).toContain("say something to this session");
	expect(listening).not.toContain("this session is");
	expect(renderToStaticMarkup(box(fleetWith(false, "open")))).toContain(
		"this session is not listening right now",
	);
	expect(renderToStaticMarkup(box(fleetWith(false, "closed")))).toContain(
		"this session is closed",
	);
	expect(renderToStaticMarkup(box(undefined))).toContain(
		"this session is not on the fleet",
	);
});

it.effect("sends what was typed by key or by button and clears the box", () =>
	Effect.gen(function* () {
		sendToSession.mockImplementation(
			(
				_sessionId: string,
				_text: string,
				onDone: () => void,
				_onError: (message: string) => void,
			) => onDone(),
		);
		const { container, root } = yield* mounted(fleetWith(true, "open"));
		yield* step(() => write(container, "come about"));
		yield* step(() => pressEnter(container));
		expect(sendToSession).toHaveBeenLastCalledWith(
			"session-1",
			"come about",
			expect.any(Function),
			expect.any(Function),
		);
		expect(container.querySelector("input")?.value).toBe("");
		yield* step(() => write(container, "mind the reef"));
		yield* step(() => container.querySelector("button")?.click());
		expect(sendToSession).toHaveBeenLastCalledWith(
			"session-1",
			"mind the reef",
			expect.any(Function),
			expect.any(Function),
		);
		expect(sendToSession).toHaveBeenCalledTimes(2);
		yield* step(() => root.unmount());
	}),
);

it.effect(
	"keeps a blank message and a session that is not listening quiet",
	() =>
		Effect.gen(function* () {
			sendToSession.mockClear();
			const { container, root } = yield* mounted(fleetWith(true, "open"));
			yield* step(() => write(container, "   "));
			yield* step(() => pressEnter(container));
			expect(sendToSession).not.toHaveBeenCalled();
			yield* step(() => root.render(box(fleetWith(false, "open"))));
			expect(container.querySelector("input")?.disabled).toBe(true);
			expect(container.querySelector("button")?.disabled).toBe(true);
			yield* step(() => root.unmount());
		}),
);
