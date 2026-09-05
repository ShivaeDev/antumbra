import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AgentDomain } from "#domain.ts";
import { dispatchingLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, makeScriptedRunner, type ScriptedBackend, sessionFor } from "#test/harness.ts";
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

it.live("a dispatched crew is told the moorage folder it was berthed in", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorder = yield* makeScriptedRunner;
		yield* Effect.gen(function* () {
			const pieces = yield* Pieces;
			const domain = yield* AgentDomain;
			yield* domain.repos.register({
				defaultRef: "main",
				source: "/workspace/Desktop",
			});
			const reef = yield* openReefVoyage;
			const alpha = yield* pieces.charter({
				charter: "Investigate lost edits after restart.",
				dependsOn: [],
				expectation: "A report identifying the cause.",
				role: "hand",
				title: "Investigate lost edits",
				voyageId: reef.id,
			});
			yield* pieces.launch(alpha.id);

			const agentId = yield* eventually(crewOf(alpha.id));
			const charter = yield* eventually(charterDelivered(scripted, agentId));
			expect(charter).toContain(`/tmp/moorage/${agentId}`);
			expect(charter).toContain(`Desktop — ./berth-0 — branch work/${agentId.slice(0, 8)}/berth-0`);
		}).pipe(Effect.provide(dispatchingLayer(temporary, scripted.backend, PATIENCE, {}, recorder.runner)));
	}),
);
