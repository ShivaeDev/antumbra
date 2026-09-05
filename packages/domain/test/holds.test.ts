import { type HoldKind, HoldSource, SettingsSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option, Stream } from "effect";
import { TestClock } from "effect/testing";
import { endTurn, makeScriptedBackend } from "#test/harness.ts";
import { deliversMail, HAND, mailed, NATIVE, wakeIntents, working } from "#test/mail-delivery-fixture.ts";
import { reportsNativeRef } from "#test/session-recovery-fixture.ts";
import { assignedPieces, chain, eventually, stateOf } from "#test/voyage-fixtures.ts";

const waitingOn = (kind: HoldKind) =>
	Effect.gen(function* () {
		const source = yield* HoldSource;
		const view = Option.getOrThrow(yield* Stream.runHead(source.holdsFeed));
		const queue = view.queues.find((entry) => entry.kind === kind);
		return (queue?.waiting ?? []).map((entry) => entry.title);
	});

const spawnIntents = Effect.gen(function* () {
	const db = yield* Database;
	return yield* db.Intent.where({ tag: "agent/spawn" }).all();
});

it.effectApp("a master hold leaves every launched piece queued until it is lifted", function* () {
	const settings = yield* SettingsSource;
	yield* settings.change({ key: "holdEverything", value: true });
	const { alpha, voyage } = yield* chain;
	yield* TestClock.adjust(5000);
	expect(yield* spawnIntents).toEqual([]);
	expect(yield* stateOf(voyage.id, alpha.id)).toBe("ready");
	expect(yield* waitingOn("dispatch")).toEqual(["alpha"]);

	yield* settings.change({ key: "holdEverything", value: false });
	yield* TestClock.adjust(5000);
	yield* TestClock.withLive(
		eventually(
			Effect.gen(function* () {
				expect(yield* assignedPieces).toEqual([alpha.id]);
			}),
		),
	);
});

it.effectApp.withProviders(
	"holding wakes leaves due mail undelivered and the resting agent listed",
	Effect.gen(function* () {
		const scripted = yield* makeScriptedBackend;
		const backend = reportsNativeRef(scripted.backend, scripted, NATIVE);
		return { providers: { backends: new Map([[backend.tag, backend]]) }, state: scripted };
	}),
	function* (_, scripted) {
		yield* TestClock.withLive(
			Effect.gen(function* () {
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
			}),
		);
	},
);
