import { SightSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import {
	domainKernelLayer,
	sightSourceTestLayer,
} from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
	type ScriptedBackend,
	standDown,
} from "#test/harness.ts";
import { born, chartered, handFor, landed } from "#test/retire-crew-fixture.ts";
import { eventually } from "#test/session-recovery-fixture.ts";

const SOUNDER = "agent-sounder";
const MATE = "agent-mate";
const ELSEWHERE = "agent-elsewhere";

const sightLayer = (
	temporary: TemporaryPersistence,
	scripted: ScriptedBackend,
) =>
	sightSourceTestLayer.pipe(
		Layer.provideMerge(domainKernelLayer(temporary, scripted.backend)),
	);

const retiredAgents = Effect.gen(function* () {
	const db = yield* Database;
	const agents = yield* db.Agent.where({ status: "retired" }).all();
	return agents.map((agent) => agent.id).toSorted();
});

// why: two hands on the landed piece and one on another. The act is scoped by
// the claims staked on the piece, so the third is untouched however quiet it is
// — a crew is released piece by piece, never fleet-wide.
it.live(
	"retiring a piece's crew retires exactly the agents claimed to it",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			yield* Effect.gen(function* () {
				const sight = yield* SightSource;
				const { pieceId, voyageId } = yield* chartered;
				const other = yield* chartered;
				yield* born(handFor(SOUNDER, pieceId, voyageId));
				yield* born(handFor(MATE, pieceId, voyageId));
				yield* born(handFor(ELSEWHERE, other.pieceId, other.voyageId));
				yield* landed(pieceId);
				yield* standDown(scripted, SOUNDER);
				yield* standDown(scripted, MATE);
				yield* standDown(scripted, ELSEWHERE);

				yield* sight.retireCrew(pieceId);

				yield* eventually(
					Effect.gen(function* () {
						expect(yield* retiredAgents).toEqual([MATE, SOUNDER].toSorted());
					}),
				);
			}).pipe(Effect.provide(sightLayer(temporary, scripted)));
		}),
);

// why: a captain answers to a voyage, never to a piece, so it holds no claim on
// one. Its immunity is the shape of the claim table rather than a role string
// this code reads — which is what keeps a piece chartered for the role
// "captain" from taking the voyage's own agent down with it.
it.live("retiring a piece's crew never retires the voyage captain", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const sight = yield* SightSource;
			const { pieceId, voyageId } = yield* chartered;
			const captain = yield* domain.voyages.hail(voyageId);
			yield* born(handFor(SOUNDER, pieceId, voyageId));
			yield* landed(pieceId);
			yield* eventually(standDown(scripted, captain.agentId));
			yield* standDown(scripted, SOUNDER);

			yield* sight.retireCrew(pieceId);

			yield* eventually(
				Effect.gen(function* () {
					expect(yield* retiredAgents).toEqual([SOUNDER]);
				}),
			);
			const still = yield* db.Agent.where({ id: captain.agentId }).first();
			expect(Option.getOrThrow(still).status).toBe("alive");
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);
