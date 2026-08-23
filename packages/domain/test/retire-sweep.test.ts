import { SettingsSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
	type ScriptedBackend,
	standDown,
} from "#test/harness.ts";
import {
	born,
	chartered,
	handFor,
	landed,
	MINUTE_MILLIS,
	sweptAt,
} from "#test/retire-crew-fixture.ts";
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

// why: the sweep is what finally reclaims a berth. Every leaked worktree in the
// fleet belonged to an agent nobody ever retired, and this is the pass that
// ends that — once the crew has had long enough to say its own goodbye.
it.live(
	"the sweep retires a done piece's agent once its rest exceeds the threshold",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			yield* Effect.gen(function* () {
				const db = yield* Database;
				yield* finishedPiece(scripted);

				yield* sweptAt(16 * MINUTE_MILLIS);

				const demanded = yield* retireIntents;
				expect(demanded).toHaveLength(1);
				// why: the agent asked for none of this — the demand names the one
				// the clock chose, and the rehearsal follows that intent to its end.
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

// why: the threshold exists because a crew's farewell trails the done edge —
// the board note and the stand down come after the last outcome. Retiring
// inside it would behead a crew mid-sentence, so the wait is the whole point.
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

// why: rest is not the trigger — landing is. An agent quiet for a day on work
// that never landed is waiting, and the sweep has nothing to say about it.
it.live(
	"a piece not yet done is never swept however long its agent rests",
	() =>
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

// why: the flag is the admiral's whole answer to the sweep. Turned off, the
// clock stops asking and retirement is the button's alone.
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

// why: the catalog is read through on every pass rather than held, so a
// threshold moved in the window is in force on the next one — nothing is told,
// and nothing has to be kept in step.
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
