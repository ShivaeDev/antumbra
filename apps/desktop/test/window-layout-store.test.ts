import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { Effect, Fiber, FileSystem } from "effect";
import { TestClock } from "effect/testing";
import {
	defaultConsole,
	layoutOf,
	restorePlan,
	type WindowLayout,
} from "#adapters/windows/layout.ts";
import {
	fileLayoutStore,
	type LayoutStore,
} from "#adapters/windows/layout-store.ts";
import { layoutWriter } from "#adapters/windows/layout-writer.ts";
import { makeWindowRegistry } from "#adapters/windows/registry.ts";
import { consolePlace, ownWindow, transcriptPlace } from "#test/windows.ts";

// why: a test must never be able to reach the layout of a real installation,
// so the store only ever sees a directory this test made and removes.
const inTemporaryDirectory = <A, E>(
	use: (root: string) => Effect.Effect<A, E, FileSystem.FileSystem>,
): Effect.Effect<A, E> =>
	Effect.suspend(() => {
		const root = mkdtempSync(join(tmpdir(), "antumbra-windows-"));
		return use(root).pipe(
			Effect.provide(NodeServices.layer),
			Effect.ensuring(
				Effect.sync(() => rmSync(root, { force: true, recursive: true })),
			),
		);
	});

const storeIn = (path: string) =>
	Effect.map(FileSystem.FileSystem, (fs) => fileLayoutStore(fs, path));

const recording = (saved: Array<WindowLayout>): LayoutStore => ({
	load: Effect.succeed(undefined),
	save: (layout) =>
		Effect.sync(() => {
			saved.push(layout);
		}),
});

describe("window layout store", () => {
	it.effect("boots on a default console when there is no file yet", () =>
		inTemporaryDirectory((root) =>
			Effect.gen(function* () {
				const store = yield* storeIn(join(root, "windows.json"));

				const layout = yield* store.load;
				expect(layout).toBeUndefined();
				expect(restorePlan(layout).consoleWindow.place).toEqual(defaultConsole);
			}),
		),
	);

	it.effect("reads back the roster it wrote", () =>
		inTemporaryDirectory((root) =>
			Effect.gen(function* () {
				const store = yield* storeIn(join(root, "windows.json"));
				const written = layoutOf(
					[
						{ id: "console", place: defaultConsole },
						{ id: "child", place: transcriptPlace("session-1") },
					],
					"child",
				);

				yield* store.save(written);
				expect(yield* store.load).toEqual(written);
			}),
		),
	);

	// why: losing where the windows were must cost nothing else — not the boot
	// that read it, and not the change that asked for it to be saved.
	it.effect(
		"fails neither boot nor mutation when the file cannot be written",
		() =>
			inTemporaryDirectory((root) =>
				Effect.gen(function* () {
					const store = yield* storeIn(root);

					expect(yield* store.save(layoutOf([], null))).toBeUndefined();
					expect(yield* store.load).toBeUndefined();
				}),
			),
	);
});

describe("window layout writer", () => {
	// why: a console reports where it is on every mode click and every
	// selection. Those are one gesture, and they cost one write.
	it.effect("collapses a burst of changes into a single write", () =>
		Effect.gen(function* () {
			const saved: Array<WindowLayout> = [];
			const registry = makeWindowRegistry();
			ownWindow(registry, "console", consolePlace);
			const writer = yield* layoutWriter({
				patience: 400,
				registry,
				store: recording(saved),
			});
			const running = yield* Effect.forkChild(writer.run);

			// why: the changes are spread across the window rather than offered
			// all at once, so the patience is what collapses them and not the
			// single slot they are offered into.
			for (let round = 0; round < 12; round += 1) {
				yield* writer.note;
				yield* Effect.yieldNow;
				yield* TestClock.adjust(20);
			}
			expect(saved).toEqual([]);

			yield* TestClock.adjust(400);
			yield* Effect.yieldNow;

			expect(saved).toHaveLength(1);
			expect(saved[0]?.windows).toEqual([
				{ id: "console", place: consolePlace },
			]);

			// why: the burst leaves a tick behind it. The flag, not the queue,
			// says whether anything changed, so that tick writes nothing.
			yield* TestClock.adjust(400);
			yield* Effect.yieldNow;
			expect(saved).toHaveLength(1);

			yield* writer.note;
			yield* Effect.yieldNow;
			yield* TestClock.adjust(400);
			yield* Effect.yieldNow;
			expect(saved).toHaveLength(2);

			yield* Fiber.interrupt(running);
		}),
	);

	// why: the roster is what gets written down, so every change to it is
	// announced by the registry rather than by the callers that made it.
	it("announces every change to the roster", () => {
		const registry = makeWindowRegistry();
		let changes = 0;
		registry.onChanged(() => {
			changes += 1;
		});

		const record = ownWindow(registry, "console", consolePlace);
		expect(changes).toBe(1);
		registry.remember("console", {
			...consolePlace,
			mode: "voyages",
		});
		expect(changes).toBe(2);
		registry.noteFocus("console");
		expect(changes).toBe(3);
		registry.noteFocus("console");
		expect(changes).toBe(3);
		registry.release(record.contents);
		expect(changes).toBe(4);
		expect(registry.focused()).toBeUndefined();
	});
});
