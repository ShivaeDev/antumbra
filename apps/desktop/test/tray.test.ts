import type { AgentSummary, Fleet, SessionSummary } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Layer, ManagedRuntime, Stream } from "effect";
import {
	runFleetTray,
	type TrayHandle,
	trayTitle,
	trayTooltip,
	workingAgentCount,
} from "#adapters/tray.ts";

const session = (id: string, canInterrupt: boolean): SessionSummary => ({
	addressable: [],
	backend: "claude",
	canAttachImages: false,
	canInterrupt,
	canSend: canInterrupt,
	canSleep: false,
	cwd: "/moorage",
	diag: { current: true, execution: "active", intents: [] },
	id,
	presence: canInterrupt ? "working" : "ended",
	status: canInterrupt ? "open" : "closed",
});

const agent = (
	id: string,
	sessions: ReadonlyArray<SessionSummary>,
): AgentSummary => ({
	berths: [],
	canRetire: false,
	charter: "charter",
	diag: { currentSessionId: sessions[0]?.id ?? null, intents: [] },
	id,
	role: "crew",
	sessions,
	status: "alive",
});

const fleetOf = (agents: ReadonlyArray<AgentSummary>): Fleet => ({
	agents,
	backends: ["claude"],
	diag: { intents: [] },
	repos: [],
});

interface RecordedTray {
	readonly destroys: () => number;
	readonly handle: TrayHandle;
	readonly click: () => void;
	readonly titles: () => ReadonlyArray<string>;
	readonly tooltips: () => ReadonlyArray<string>;
}

const recordedTray = (onDestroy?: () => void): RecordedTray => {
	const titles: string[] = [];
	const tooltips: string[] = [];
	let destroys = 0;
	let listener: (() => void) | undefined;
	return {
		click: () => listener?.(),
		destroys: () => destroys,
		handle: {
			destroy: () => {
				destroys += 1;
				onDestroy?.();
			},
			onClick: (registered) => {
				listener = registered;
			},
			setTitle: (title) => {
				titles.push(title);
			},
			setToolTip: (tooltip) => {
				tooltips.push(tooltip);
			},
		},
		titles: () => titles,
		tooltips: () => tooltips,
	};
};

it("counts an agent as working when any of its sessions can be interrupted", () => {
	const fleet = fleetOf([
		agent("working", [session("quiet", false), session("turning", true)]),
		agent("waiting", [session("open", false)]),
		agent("empty", []),
	]);

	expect(workingAgentCount(fleet)).toBe(1);
});

it("counts agents rather than the sessions they are taking turns in", () => {
	const fleet = fleetOf([
		agent("busy", [session("first", true), session("second", true)]),
	]);

	expect(workingAgentCount(fleet)).toBe(1);
});

it("leaves the menu-bar title empty when no agent is working", () => {
	expect(trayTitle(0)).toBe("");
	expect(trayTitle(3)).toBe("3");
});

it("names the empty state and the count in the tooltip", () => {
	expect(trayTooltip(0)).toBe("Antumbra — no agent is working");
	expect(trayTooltip(1)).toBe("Antumbra — 1 agent working");
	expect(trayTooltip(4)).toBe("Antumbra — 4 agents working");
});

it.effect("publishes the working count of every snapshot the feed emits", () =>
	Effect.gen(function* () {
		const tray = recordedTray();
		const feed = Stream.fromArray([
			fleetOf([agent("one", [session("turning", true)])]),
			fleetOf([agent("one", [session("turning", false)])]),
		]);

		yield* runFleetTray({ create: () => tray.handle }, feed, Effect.void);

		expect(tray.titles()).toEqual(["1", ""]);
		expect(tray.tooltips()).toEqual([
			"Antumbra — 1 agent working",
			"Antumbra — no agent is working",
		]);
		expect(tray.destroys()).toBe(1);
	}),
);

it.effect("opens the window when the tray icon is clicked", () =>
	Effect.gen(function* () {
		const activated = yield* Deferred.make<void>();
		const tray = recordedTray();
		const feed = Stream.fromArray([fleetOf([])]).pipe(
			Stream.concat(Stream.never),
		);

		const fiber = yield* Effect.forkChild(
			runFleetTray(
				{ create: () => tray.handle },
				feed,
				Deferred.succeed(activated, undefined),
			),
		);
		yield* Effect.yieldNow;
		tray.click();

		yield* Deferred.await(activated);
		yield* Fiber.interrupt(fiber);
	}),
);

// why: the tray is forked onto the desktop's ManagedRuntime, so this is the
// exact quit path — disposing the runtime must interrupt the feed subscription
// and release the icon rather than leave either behind.
it.effect("destroys the tray when the runtime that forked it is disposed", () =>
	Effect.gen(function* () {
		const destroyed = yield* Deferred.make<void>();
		const tray = recordedTray(() => {
			Effect.runSync(Deferred.succeed(destroyed, undefined));
		});
		const runtime = ManagedRuntime.make(Layer.empty);
		runtime.runFork(
			runFleetTray({ create: () => tray.handle }, Stream.never, Effect.void),
		);
		yield* Effect.yieldNow;

		yield* Effect.promise(() => runtime.dispose());

		yield* Deferred.await(destroyed);
		expect(tray.destroys()).toBe(1);
	}),
);
