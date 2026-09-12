import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Layer, ManagedRuntime, Stream } from "effect";
import { runFleetTray, type TrayHandle, trayTitle, trayTooltip } from "#adapters/tray.ts";

interface RecordedTray {
	readonly destroys: () => number;
	readonly handle: TrayHandle;
	readonly click: () => void;
	readonly titles: () => ReadonlyArray<string>;
	readonly tooltips: () => ReadonlyArray<string>;
}

const recordedTray = (onDestroy?: () => void, onClickRegistered?: () => void): RecordedTray => {
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
				onClickRegistered?.();
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
		const feed = Stream.fromArray([1, 0]);

		yield* runFleetTray({ create: () => tray.handle }, feed, Effect.void);

		expect(tray.titles()).toEqual(["1", ""]);
		expect(tray.tooltips()).toEqual(["Antumbra — 1 agent working", "Antumbra — no agent is working"]);
		expect(tray.destroys()).toBe(1);
	}),
);

it.effect("opens the window when the tray icon is clicked", () =>
	Effect.gen(function* () {
		const activated = yield* Deferred.make<void>();
		const registered = yield* Deferred.make<void>();
		const tray = recordedTray(undefined, () => Effect.runSync(Deferred.succeed(registered, undefined)));
		const feed = Stream.fromArray([0]).pipe(Stream.concat(Stream.never));

		const fiber = yield* Effect.forkChild(runFleetTray({ create: () => tray.handle }, feed, Deferred.succeed(activated, undefined)));
		yield* Deferred.await(registered);
		tray.click();

		yield* Deferred.await(activated);
		yield* Fiber.interrupt(fiber);
	}),
);

it.effect("destroys the tray when the runtime that forked it is disposed", () =>
	Effect.gen(function* () {
		const destroyed = yield* Deferred.make<void>();
		const registered = yield* Deferred.make<void>();
		const tray = recordedTray(
			() => {
				Effect.runSync(Deferred.succeed(destroyed, undefined));
			},
			() => Effect.runSync(Deferred.succeed(registered, undefined)),
		);
		const runtime = ManagedRuntime.make(Layer.empty);
		runtime.runFork(runFleetTray({ create: () => tray.handle }, Stream.never, Effect.void));
		yield* Deferred.await(registered);

		yield* Effect.promise(() => runtime.dispose());

		yield* Deferred.await(destroyed);
		expect(tray.destroys()).toBe(1);
	}),
);
