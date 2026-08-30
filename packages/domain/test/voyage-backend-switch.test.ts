import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { dispatchingLayer, domainKernelLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
} from "#test/harness.ts";
import {
	aliveAgent,
	assignedPieces,
	eventually,
	PATIENCE,
} from "#test/voyage-fixtures.ts";
import type { VoyageProcedures } from "#voyages.ts";

// why: the refusals a backend switch owes are proved with no kernel next door,
// in voyage-write-invariants. These claims need a crew already sailing, and
// only a live scheduler can put one there — so they stand apart rather than
// dragging every graph-write invariant back under the kernel.
const withCrewedDomain = <A, E, R>(
	body: (voyages: VoyageProcedures) => Effect.Effect<A, E, R>,
) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			yield* body(domain.voyages);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	});

const reef = (voyages: VoyageProcedures) =>
	voyages.open({
		backend: "scripted",
		context: "the reef is uncharted",
		name: "Chart the reef",
		northStar: "every shoal is known",
	});

const sessionBackends = Effect.gen(function* () {
	const db = yield* Database;
	return (yield* db.AgentSession.all()).map((session) => session.backend);
});

// why: "codex" is not registered in these tests, so a spawn that read the
// wrong seat could not have been born at all — the seat under test is the only
// one that names a backend a session could ever have opened against.
it.live("a hail seats the captain on the captain's own backend", () =>
	withCrewedDomain((voyages) =>
		Effect.gen(function* () {
			const voyage = yield* reef(voyages);
			yield* voyages.setCrewBackend(voyage.id, "codex");

			const hailed = yield* voyages.hail(voyage.id);
			yield* eventually(aliveAgent(hailed.agentId));

			expect(yield* sessionBackends).toEqual(["scripted"]);
		}),
	),
);

it.live("a piece worked now seats its crew on the crew's own backend", () =>
	withCrewedDomain((voyages) =>
		Effect.gen(function* () {
			const voyage = yield* reef(voyages);
			yield* voyages.setCaptainBackend(voyage.id, "codex");
			const piece = yield* voyages.charterPiece({
				charter: "sound the eastern shoal",
				dependsOn: [],
				expectation: "the soundings are landed",
				role: "hand",
				title: "Sound",
				voyageId: voyage.id,
			});

			const crewed = yield* voyages.workNow(piece.id);
			yield* eventually(aliveAgent(crewed.agentId));

			expect(yield* sessionBackends).toEqual(["scripted"]);
		}),
	),
);

it.live(
	"a switched backend retargets the voyage and no session already open",
	() =>
		withCrewedDomain((voyages) =>
			Effect.gen(function* () {
				const db = yield* Database;
				const voyage = yield* reef(voyages);
				const hailed = yield* voyages.hail(voyage.id);
				yield* eventually(aliveAgent(hailed.agentId));

				yield* voyages.setCrewBackend(voyage.id, "codex");

				const stored = Option.getOrThrow(
					yield* db.Voyage.where({ id: voyage.id }).first(),
				);
				expect(stored.crewBackend).toBe("codex");
				expect(stored.captainBackend).toBe("scripted");
				expect(yield* sessionBackends).toEqual(["scripted"]);
			}),
		),
);

it.live("the ladder dispatches a piece on the crew's backend", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const voyage = yield* reef(domain.voyages);
			yield* domain.voyages.setCaptainBackend(voyage.id, "codex");
			const piece = yield* domain.voyages.charterPiece({
				charter: "sound the eastern shoal",
				dependsOn: [],
				expectation: "the soundings are landed",
				role: "hand",
				title: "Sound",
				voyageId: voyage.id,
			});
			yield* domain.voyages.launch(piece.id);

			yield* eventually(
				Effect.gen(function* () {
					expect(yield* assignedPieces).toEqual([piece.id]);
					expect(yield* sessionBackends).toEqual(["scripted"]);
				}),
			);
		}).pipe(
			Effect.provide(dispatchingLayer(temporary, scripted.backend, PATIENCE)),
		);
	}),
);
