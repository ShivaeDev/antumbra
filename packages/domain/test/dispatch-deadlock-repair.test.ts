import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend } from "#test/harness.ts";
import { openReefVoyage, stateOf } from "#test/voyage-fixtures.ts";

const STRANDED = "agent-stranded";

it.live("a boot frees a Piece its Agent can no longer work", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;

		const held = yield* Effect.gen(function* () {
			const pieces = yield* Pieces;
			const db = yield* Database;
			const voyage = yield* openReefVoyage;
			const piece = yield* pieces.charter({
				charter: "sound the shallows",
				dependsOn: [],
				expectation: "soundings are landed",
				role: "hand",
				title: "alpha",
				voyageId: voyage.id,
			});
			yield* pieces.launch(piece.id);
			yield* db.Agent.create({
				charter: "sound the shallows",
				currentSessionId: null,
				id: STRANDED,
				role: "hand",
				status: "alive",
			}).pipe(Effect.andThen(db.PieceAgent.create({ agentId: STRANDED, pieceId: piece.id })));
			expect(yield* stateOf(voyage.id, piece.id)).toBe("active");
			return { pieceId: piece.id, voyageId: voyage.id };
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));

		yield* Effect.gen(function* () {
			const db = yield* Database;
			const agent = Option.getOrThrow(yield* db.Agent.where({ id: STRANDED }).first());
			expect(agent.status).toBe("dormant");
			expect(agent.currentSessionId).toBe(null);
			expect(yield* stateOf(held.voyageId, held.pieceId)).toBe("ready");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
