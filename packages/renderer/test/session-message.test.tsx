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

type Presence = Fleet["agents"][number]["sessions"][number]["presence"];
type Intent = Fleet["diag"]["intents"][number];

const waking = (state: string): ReadonlyArray<Intent> => [
	{ id: "intent-1", kind: "agent/recover", state },
];

const fleetWith = (
	presence: Presence,
	intents: ReadonlyArray<Intent> = [],
): Fleet => ({
	agents: [
		{
			berths: [],
			canRetire: presence !== "working",
			charter: "chart the reef",
			diag: { currentSessionId: "session-1", intents: [] },
			id: "agent-1",
			role: "navigator",
			sessions: [
				{
					addressable: [],
					backend: "scripted",
					canInterrupt: presence === "working",
					canSend: presence !== "ended",
					canSleep: presence === "idle",
					cwd: "/tmp/reef",
					diag: { current: true, execution: "active", intents },
					id: "session-1",
					presence,
					status: presence === "ended" ? "closed" : "open",
				},
			],
			status: "alive",
		},
	],
	backends: ["scripted"],
	diag: { intents: [] },
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

// why: the footer says who is listening, not whether the admiral is allowed to
// speak. Three of the four states take words; only the ended one refuses, so
// the box says what it will do rather than making a reader guess whether
// sending is pointless.
it("says who is listening rather than refusing to take the words", () => {
	const working = renderToStaticMarkup(box(fleetWith("working")));
	expect(working).toContain("say something to this session");
	// why: a session taking a turn needs no footnote — the box is the answer.
	expect(working).not.toContain("this session is");
	expect(working).not.toContain("this session has");
	expect(renderToStaticMarkup(box(fleetWith("idle")))).toContain(
		"listening, with nothing to do",
	);
	expect(renderToStaticMarkup(box(fleetWith("asleep")))).toContain(
		"asleep — it will wake when you speak to it",
	);
	expect(renderToStaticMarkup(box(fleetWith("ended")))).toContain(
		"this session has ended",
	);
	expect(renderToStaticMarkup(box(undefined))).toContain(
		"this session is not on the fleet",
	);
});

// why: the sentence the correction deleted. A Session that stood down or was
// put to siesta is reachable, and no surface may tell a reader otherwise.
it("never tells the admiral a session is not listening", () => {
	for (const presence of ["working", "idle", "asleep", "ended"] as const) {
		expect(renderToStaticMarkup(box(fleetWith(presence)))).not.toContain(
			"not listening",
		);
	}
});

// why: the send that roused rather than delivered is the whole reason this note
// exists. Before it, the box repeated the invitation it had already been taken
// up on, which reads as words that landed.
it("says a wake is under way rather than repeating the invitation", () => {
	const asking = renderToStaticMarkup(
		box(fleetWith("asleep", waking("running"))),
	);
	expect(asking).toContain("waking — the words it carries land when it does");
	expect(asking).not.toContain("it will wake when you speak to it");
	expect(
		renderToStaticMarkup(box(fleetWith("asleep", waking("queued")))),
	).toContain("waking — the words it carries land when it does");
});

// why: a parked wake is the state this whole branch was built to make visible —
// a send whose words are written down and going nowhere until something pushes
// them. Saying "waking" there would be the silent success wearing a verb.
it("says a parked wake is parked", () => {
	const parked = renderToStaticMarkup(
		box(fleetWith("asleep", waking("waiting"))),
	);
	expect(parked).toContain(
		"a wake is parked — the words it carries are still waiting to land",
	);
	expect(parked).not.toContain("waking —");
});

// why: the note belongs to the wake, not to the presence, so a Session the
// fleet already calls awake keeps it for as long as the recover is live — the
// words are with the Intent until it succeeds either way.
it("keeps the wake note while the recover outlives the sleep", () => {
	expect(
		renderToStaticMarkup(box(fleetWith("working", waking("running")))),
	).toContain("waking — the words it carries land when it does");
	expect(renderToStaticMarkup(box(fleetWith("idle")))).not.toContain("waking");
});

// why: only an ended Session closes the box. An asleep one takes the words and
// wakes on them, so disabling the input there would be the old refusal wearing
// a calmer sentence.
it.effect("keeps the box open for every state but the one that has ended", () =>
	Effect.gen(function* () {
		for (const presence of ["working", "idle", "asleep"] as const) {
			const { container, root } = yield* mounted(fleetWith(presence));
			expect(container.querySelector("input")?.disabled).toBe(false);
			yield* step(() => root.unmount());
		}
		const { container, root } = yield* mounted(fleetWith("ended"));
		expect(container.querySelector("input")?.disabled).toBe(true);
		yield* step(() => root.unmount());
	}),
);

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
		const { container, root } = yield* mounted(fleetWith("working"));
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

it.effect("keeps a blank message and a session that has ended quiet", () =>
	Effect.gen(function* () {
		sendToSession.mockClear();
		const { container, root } = yield* mounted(fleetWith("working"));
		yield* step(() => write(container, "   "));
		yield* step(() => pressEnter(container));
		expect(sendToSession).not.toHaveBeenCalled();
		yield* step(() => root.render(box(fleetWith("ended"))));
		expect(container.querySelector("input")?.disabled).toBe(true);
		expect(container.querySelector("button")?.disabled).toBe(true);
		yield* step(() => root.unmount());
	}),
);
