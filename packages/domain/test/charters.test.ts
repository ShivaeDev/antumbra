import { BoardScope, EntryInput } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { dispatchingLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
	type ScriptedBackend,
	sessionFor,
} from "#test/harness.ts";
import { onPiece, ruled, seedAsker, unruled } from "#test/ruling-fixtures.ts";
import { eventually, openReefVoyage, PATIENCE } from "#test/voyage-fixtures.ts";

const crewOf = (pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = (yield* db.PieceAgent.where({ pieceId }).all())[0];
		return row === undefined ? yield* Effect.fail("no crew yet") : row.agentId;
	});

const charterDelivered = (scripted: ScriptedBackend, agentId: string) =>
	Effect.gen(function* () {
		const live = yield* sessionFor(scripted, agentId);
		const sent = yield* live.sent;
		return sent[0] ?? (yield* Effect.fail("no charter yet"));
	});

it.live("a dispatched crew is told the smooth log, never the rough one", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const reef = yield* openReefVoyage;
			const alpha = yield* domain.voyages.charterPiece({
				charter: "sound the shallows",
				dependsOn: [],
				expectation: "soundings are landed",
				role: "hand",
				title: "alpha",
				voyageId: reef.id,
			});
			const wrote = (body: string, register: "rough" | "smooth") =>
				domain.boards.write(
					BoardScope.Voyage({ voyageId: reef.id }),
					EntryInput.Note({ authorAgentId: Option.none(), body, register }),
				);
			yield* wrote("the eastern approach is safe", "smooth");
			yield* wrote("the swell is running", "rough");
			yield* domain.boards.write(
				BoardScope.Piece({ pieceId: alpha.id }),
				EntryInput.Note({
					authorAgentId: Option.none(),
					body: "the last hand reached the reef edge",
					register: "smooth",
				}),
			);
			yield* domain.voyages.launch(alpha.id);

			const agentId = yield* eventually(crewOf(alpha.id));
			const charter = yield* eventually(charterDelivered(scripted, agentId));
			expect(charter).toContain("the eastern approach is safe");
			expect(charter).toContain("the last hand reached the reef edge");
			expect(charter).not.toContain("the swell is running");
		}).pipe(
			Effect.provide(dispatchingLayer(temporary, scripted.backend, PATIENCE)),
		);
	}),
);

// why: what binds a crew is decided by the record, not by the crew — a ruling
// about its piece or about the whole fleet is in its charter before it asks,
// and one about another piece or still open is not.
it.live("a dispatched crew is told the standing rulings that bind it", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const reef = yield* openReefVoyage;
			const charter = (title: string) =>
				domain.voyages.charterPiece({
					charter: `do ${title}`,
					dependsOn: [],
					expectation: `${title} is landed`,
					role: "hand",
					title,
					voyageId: reef.id,
				});
			const alpha = yield* charter("alpha");
			const bravo = yield* charter("bravo");
			yield* seedAsker;
			yield* ruled("which reading do we trust?", "trust the soundings", {
				radius: "fleet",
				subjects: [],
			});
			yield* ruled("may alpha dredge the reef?", "no", {
				radius: "piece",
				subjects: onPiece(alpha.id),
			});
			yield* unruled("may alpha anchor overnight?", {
				radius: "piece",
				subjects: onPiece(alpha.id),
			});
			yield* ruled("may bravo dredge the reef?", "yes", {
				radius: "piece",
				subjects: onPiece(bravo.id),
			});
			yield* domain.voyages.launch(alpha.id);

			const agentId = yield* eventually(crewOf(alpha.id));
			const charterText = yield* eventually(
				charterDelivered(scripted, agentId),
			);
			expect(charterText).toContain("# Standing rulings");
			expect(charterText).toContain(
				"which reading do we trust? — trust the soundings",
			);
			expect(charterText).toContain("may alpha dredge the reef? — no");
			expect(charterText).not.toContain("anchor overnight");
			expect(charterText).not.toContain("may bravo dredge");
		}).pipe(
			Effect.provide(dispatchingLayer(temporary, scripted.backend, PATIENCE)),
		);
	}),
);
