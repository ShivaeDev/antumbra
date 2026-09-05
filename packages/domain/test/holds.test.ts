import { type HoldKind, HoldSource, SettingsSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Option, Stream } from "effect";
import { TestClock } from "effect/testing";
import { HoldSourceLive } from "#hold-source.ts";
import { dispatchingLayer, domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, endTurn, makeScriptedBackend } from "#test/harness.ts";
import { deliversMail, HAND, mailed, NATIVE, wakeIntents, working } from "#test/mail-delivery-fixture.ts";
import { reportsNativeRef } from "#test/session-recovery-fixture.ts";
import { assignedPieces, chain, eventually, PATIENCE, stateOf } from "#test/voyage-fixtures.ts";

const waitingOn = (kind: HoldKind) =>
	Effect.gen(function* () {
		const source = yield* HoldSource;
		const view = Option.getOrThrow(yield* Stream.runHead(source.holdsFeed));
		const queue = view.queues.find((entry) => entry.kind === kind);
		return (queue?.waiting ?? []).map((entry) => entry.title);
	});

const holdingLayer = (...args: Parameters<typeof dispatchingLayer>) => HoldSourceLive.pipe(Layer.provideMerge(dispatchingLayer(...args)));

const spawnIntents = Effect.gen(function* () {
	const db = yield* Database;
	return yield* db.Intent.where({ tag: "agent/spawn" }).all();
});

it.effect("a master hold leaves every launched piece queued until it is lifted", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const settings = yield* SettingsSource;
			yield* settings.change({ key: "holdEverything", value: true });
			const { alpha, voyage } = yield* chain;
			yield* TestClock.adjust(300);
			expect(yield* spawnIntents).toEqual([]);
			expect(yield* stateOf(voyage.id, alpha.id)).toBe("ready");
			expect(yield* waitingOn("dispatch")).toEqual(["alpha"]);

			yield* settings.change({ key: "holdEverything", value: false });
			yield* TestClock.adjust(50);
			yield* TestClock.withLive(
				eventually(
					Effect.gen(function* () {
						expect(yield* assignedPieces).toEqual([alpha.id]);
					}),
				),
			);
		}).pipe(Effect.provide(holdingLayer(temporary, scripted.backend, PATIENCE)));
	}),
);

it.live("holding wakes leaves due mail undelivered and the resting agent listed", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const settings = yield* SettingsSource;
			yield* settings.change({ key: "holdWakes", value: true });
			yield* working(scripted);
			yield* endTurn(scripted, HAND.agentId);
			yield* mailed("the eastern approach is closed", "test:held-wake");
			yield* deliversMail;
			expect(yield* wakeIntents).toEqual([]);
			expect(yield* db.BoardEntryDelivery.all()).toEqual([]);
			expect(yield* waitingOn("wake")).toEqual([HAND.role]);

			yield* settings.change({ key: "holdWakes", value: false });
			yield* deliversMail;
			expect(yield* wakeIntents).toHaveLength(1);
		}).pipe(
			Effect.provide(HoldSourceLive.pipe(Layer.provideMerge(domainKernelLayer(temporary, reportsNativeRef(scripted.backend, scripted, NATIVE))))),
		);
	}),
);
