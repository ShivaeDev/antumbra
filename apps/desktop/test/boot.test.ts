import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { ownerBoot } from "#adapters/boot.ts";
import {
	claimDesktopOwnership,
	runnerRootsInDataDirectory,
} from "#adapters/shell.ts";
import { makeWindowRegistry } from "#adapters/windows/registry.ts";
import {
	consolePlace,
	handleFor,
	ownWindow,
	transcriptPlace,
} from "#test/windows.ts";

it("gives every agent a moorage beside the mirrors it is cut from", () => {
	expect(runnerRootsInDataDirectory("/data")).toEqual({
		moorageRoot: "/data/moorage",
		reposRoot: "/data/repos",
	});
});

describe("desktop process ownership", () => {
	it.effect(
		"acquires ownership before runtime startup and skips startup when held",
		() =>
			Effect.gen(function* () {
				const held: Array<string> = [];
				yield* ownerBoot(
					Effect.sync(() => {
						held.push("ownership");
						return false;
					}),
					() => {
						held.push("factory");
						return Effect.sync(() => held.push("runtime"));
					},
				);
				expect(held).toEqual(["ownership"]);

				const owned: Array<string> = [];
				yield* ownerBoot(
					Effect.sync(() => {
						owned.push("ownership");
						return true;
					}),
					() => {
						owned.push("factory");
						return Effect.sync(() => owned.push("runtime"));
					},
				);
				expect(owned).toEqual(["ownership", "factory", "runtime"]);
			}),
	);

	// why: the console is the app. A detached window opened earlier must never
	// stand in for it when a second launch is handed to the owning process.
	it.effect("routes a second launch to the console in the owning process", () =>
		Effect.gen(function* () {
			const calls: Array<string> = [];
			const registry = makeWindowRegistry();
			ownWindow(
				registry,
				"child",
				transcriptPlace("session-1"),
				handleFor(calls, "child"),
			);
			ownWindow(
				registry,
				"console",
				consolePlace,
				handleFor(calls, "console", true),
			);
			let secondInstance: (() => void) | undefined;
			const claimed = yield* claimDesktopOwnership(
				{
					onSecondInstance: (listener) => {
						secondInstance = listener;
					},
					quit: () => calls.push("quit"),
					requestSingleInstanceLock: () => true,
				},
				registry,
				Effect.sync(() => calls.push("open")),
			);
			expect(claimed).toBe(true);
			expect(secondInstance).toBeDefined();
			secondInstance?.();
			yield* Effect.yieldNow;
			expect(calls).toEqual([
				"restore console",
				"show console",
				"focus console",
			]);
		}),
	);

	it.effect("opens the console when a second launch finds none open", () =>
		Effect.gen(function* () {
			const calls: Array<string> = [];
			let secondInstance: (() => void) | undefined;
			yield* claimDesktopOwnership(
				{
					onSecondInstance: (listener) => {
						secondInstance = listener;
					},
					quit: () => calls.push("quit"),
					requestSingleInstanceLock: () => true,
				},
				makeWindowRegistry(),
				Effect.sync(() => calls.push("open")),
			);
			secondInstance?.();
			yield* Effect.yieldNow;
			expect(calls).toEqual(["open"]);
		}),
	);

	it.effect(
		"quits a second process after Electron hands its launch to the owner",
		() =>
			Effect.gen(function* () {
				const calls: Array<string> = [];
				const claimed = yield* claimDesktopOwnership(
					{
						onSecondInstance: () => calls.push("listener"),
						quit: () => calls.push("quit"),
						requestSingleInstanceLock: () => false,
					},
					makeWindowRegistry(),
					Effect.void,
				);
				expect(claimed).toBe(false);
				expect(calls).toEqual(["quit"]);
			}),
	);
});
