import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { ownerBoot } from "#adapters/boot.ts";
import {
	claimDesktopOwnership,
	runnerRootsInDataDirectory,
} from "#adapters/shell.ts";

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

	it.effect("routes a second launch to a window in the owning process", () =>
		Effect.gen(function* () {
			const calls: Array<string> = [];
			let secondInstance: (() => void) | undefined;
			const window = {
				focus: () => calls.push("focus"),
				isMinimized: () => true,
				restore: () => calls.push("restore"),
				show: () => calls.push("show"),
			};
			const claimed = yield* claimDesktopOwnership(
				{
					onSecondInstance: (listener) => {
						secondInstance = listener;
					},
					quit: () => calls.push("quit"),
					requestSingleInstanceLock: () => true,
				},
				{ getAllWindows: () => [window] },
			);
			expect(claimed).toBe(true);
			expect(secondInstance).toBeDefined();
			secondInstance?.();
			yield* Effect.yieldNow;
			expect(calls).toEqual(["restore", "show", "focus"]);
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
					{ getAllWindows: () => [] },
				);
				expect(claimed).toBe(false);
				expect(calls).toEqual(["quit"]);
			}),
	);
});
