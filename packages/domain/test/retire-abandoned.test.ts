import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { changeOf } from "#test/change-fixtures.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, type ScriptedBackend, standDown } from "#test/harness.ts";
import { born, chartered, handFor, landed, MINUTE_MILLIS, swept, sweptAt } from "#test/retire-crew-fixture.ts";
import { eventually } from "#test/session-recovery-fixture.ts";
import { stateOf } from "#test/voyage-fixtures.ts";

const HAND = "agent-written-off";

const retireIntents = Effect.gen(function* () {
	const db = yield* Database;
	return yield* db.Intent.where({ tag: "agent/retire" }).all();
});

const statusOf = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const agent = yield* db.Agent.where({ id: agentId }).first();
		return Option.getOrThrow(agent).status;
	});

// why: the crew is born before the verdict lands, because an abandoned piece
// refuses crew — which is also the only order that produces the situation this
// sweep exists for: hands already at work on something since written off.
const writtenOffPiece = (scripted: ScriptedBackend, quiet: boolean) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const { pieceId, voyageId } = yield* chartered;
		yield* born(handFor(HAND, pieceId, voyageId));
		if (quiet) {
			yield* standDown(scripted, HAND);
		}
		yield* domain.voyages.landPieceVerdict(pieceId, "abandoned");
		return pieceId;
	});

// why: a change that closed and nothing under way to replace it — the piece
// has a landed report and no outcome pending, and no verdict was ever spoken
// over it. This is the shape of "the PR just closed".
const closedWithoutVerdict = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const { pieceId, voyageId } = yield* chartered;
		yield* born(handFor(HAND, pieceId, voyageId));
		yield* landed(pieceId);
		yield* standDown(scripted, HAND);
		yield* db.transaction(
			Effect.gen(function* () {
				yield* Database;
				yield* Effect.all([
					db.Change.create(
						changeOf({
							headRef: `work/${HAND}/berth-0`,
							id: "change-closed",
							repoId: "repo-reef",
							stage: "withdrawn",
						}),
					),
					db.PieceChange.create({ changeId: "change-closed", pieceId }),
				]);
			}),
		);
		return { pieceId, voyageId };
	});

// why: pressing abandon is itself the order to clean up, so there is nothing
// left to wait for. The threshold exists because a finished crew's farewell
// trails its last outcome — a written-off crew has no farewell coming, and
// holding its berth for the hour would be hesitation rather than courtesy.
it.live("an abandoned piece's crew is retired on the very next pass", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* writtenOffPiece(scripted, true);

			// why: the clock is left exactly where it is. Nothing here waits.
			yield* swept;

			const demanded = yield* retireIntents;
			expect(demanded).toHaveLength(1);
			expect(demanded[0]?.payload).toContain(HAND);
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* statusOf(HAND)).toBe("retired");
				}),
			);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

// why: the distinction the whole ruling turns on. A closed change says only
// that this attempt is over — nothing in it says whether the work wants
// another attempt or an ending, and reading it as an ending would retire a
// crew the admiral may have meant to let try again. Only a verdict carries
// that instruction, so a piece without one waits out the hour like any other.
it.live("a piece whose change merely closed waits out the ordinary rest", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const { pieceId, voyageId } = yield* closedWithoutVerdict(scripted);
			// why: assert the closed change is really on the piece before reading
			// anything off it — a link that quietly failed would leave a piece done
			// for the plain reason that nothing was ever proposed on it, and the
			// rest of this would pass without testing the case at all.
			expect(yield* db.PieceChange.where({ pieceId }).all()).toHaveLength(1);
			// why: the piece reads done — a withdrawn change with nothing under way
			// to replace it leaves no outcome pending — so it is the done rules it
			// must be held to, not the written-off ones.
			expect(yield* stateOf(voyageId, pieceId)).toBe("done");
			expect(yield* db.PieceVerdict.all()).toEqual([]);

			yield* swept;
			expect(yield* retireIntents).toEqual([]);
			expect(yield* statusOf(HAND)).toBe("alive");

			yield* sweptAt(16 * MINUTE_MILLIS);
			expect(yield* retireIntents).toHaveLength(1);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

// why: immediate is not the same as rude. A verdict lands while its crew may
// still be mid-word, and cutting that off would sever work the Agent is doing
// — so the one thing the sweep still waits for is the turn to end, however
// long that takes and whatever the threshold says.
it.live("an abandoned piece's working crew is left alone until it stops", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* writtenOffPiece(scripted, false);

			// why: a day of it changes nothing while the Agent is still working —
			// this is not the threshold biding its time, it is the turn.
			yield* sweptAt(24 * 60 * MINUTE_MILLIS);

			expect(yield* retireIntents).toEqual([]);
			expect(yield* statusOf(HAND)).toBe("alive");

			yield* standDown(scripted, HAND);
			yield* swept;

			expect(yield* retireIntents).toHaveLength(1);
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* statusOf(HAND)).toBe("retired");
				}),
			);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
