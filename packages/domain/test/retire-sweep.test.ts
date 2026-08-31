import { SettingsSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, type ScriptedBackend, standDown } from "#test/harness.ts";
import { born, chartered, handFor, landed, MINUTE_MILLIS, sweptAt } from "#test/retire-crew-fixture.ts";
import { eventually } from "#test/session-recovery-fixture.ts";

const HAND = "agent-swept";

const retireIntents = Effect.gen(function* () {
	const db = yield* Database;
	return yield* db.Intent.where({ tag: "agent/retire" }).all();
});

const finishedPiece = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const { pieceId, voyageId } = yield* chartered;
		yield* born(handFor(HAND, pieceId, voyageId));
		yield* landed(pieceId);
		yield* standDown(scripted, HAND);
		return pieceId;
	});

it.live("the sweep retires a done piece's agent once its rest exceeds the threshold", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* finishedPiece(scripted);

			yield* sweptAt(16 * MINUTE_MILLIS);

			const demanded = yield* retireIntents;
			expect(demanded).toHaveLength(1);
			expect(demanded[0]?.payload).toContain(HAND);
			yield* eventually(
				Effect.gen(function* () {
					const agent = yield* db.Agent.where({ id: HAND }).first();
					expect(Option.getOrThrow(agent).status).toBe("retired");
				}),
			);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("a done piece's agent still inside the threshold is left alone", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* finishedPiece(scripted);

			yield* sweptAt(14 * MINUTE_MILLIS);

			expect(yield* retireIntents).toEqual([]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("a piece not yet done is never swept however long its agent rests", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const { pieceId, voyageId } = yield* chartered;
			yield* born(handFor(HAND, pieceId, voyageId));
			yield* standDown(scripted, HAND);

			yield* sweptAt(24 * 60 * MINUTE_MILLIS);

			expect(yield* retireIntents).toEqual([]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("the sweep does nothing when the flag setting is off", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const settings = yield* SettingsSource;
			yield* finishedPiece(scripted);
			yield* settings.change({ key: "retireSweep", value: false });

			yield* sweptAt(60 * MINUTE_MILLIS);

			expect(yield* retireIntents).toEqual([]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("the threshold honors a changed setting on the next pass", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const settings = yield* SettingsSource;
			yield* finishedPiece(scripted);

			yield* sweptAt(6 * MINUTE_MILLIS);
			expect(yield* retireIntents).toEqual([]);

			yield* settings.change({ key: "retireRestMinutes", value: 5 });
			yield* sweptAt(6 * MINUTE_MILLIS);

			expect(yield* retireIntents).toHaveLength(1);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
