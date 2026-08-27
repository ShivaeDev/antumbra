import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
} from "#test/harness.ts";
import { openReefVoyage, stateOf } from "#test/voyage-fixtures.ts";

const STRANDED = "agent-stranded";

// why: an Agent alive with no current Session and no open root is the state the
// dispatcher cannot break out of on its own — its Piece reads as active, so the
// pool never offers the Piece again and no replacement is ever born. The repair
// belongs to boot, which is why this test crosses one: the rows are written
// under the first domain, and the second domain's own boot is what frees them.
it.live("a boot frees a Piece its Agent can no longer work", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;

		const held = yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const voyage = yield* openReefVoyage;
			const piece = yield* domain.voyages.charterPiece({
				charter: "sound the shallows",
				dependsOn: [],
				expectation: "soundings are landed",
				role: "hand",
				title: "alpha",
				voyageId: voyage.id,
			});
			yield* domain.voyages.launch(piece.id);
			yield* db.transaction(
				Database.use(() =>
					db.Agent.create({
						charter: "sound the shallows",
						currentSessionId: null,
						id: STRANDED,
						role: "hand",
						status: "alive",
					}).pipe(
						Effect.andThen(
							db.PieceAgent.create({ agentId: STRANDED, pieceId: piece.id }),
						),
					),
				),
			);
			expect(yield* stateOf(voyage.id, piece.id)).toBe("active");
			return { pieceId: piece.id, voyageId: voyage.id };
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));

		yield* Effect.gen(function* () {
			const db = yield* Database;
			const agent = Option.getOrThrow(
				yield* db.Agent.where({ id: STRANDED }).first(),
			);
			expect(agent.status).toBe("dormant");
			expect(agent.currentSessionId).toBe(null);
			expect(yield* stateOf(held.voyageId, held.pieceId)).toBe("ready");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
