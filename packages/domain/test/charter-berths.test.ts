import { Database } from "@antumbra/persistence";
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
			const domain = yield* AgentDomain;
			yield* domain.repos.register({
				defaultRef: "main",
				source: "/somewhere/Reef-Charts",
			});
			const reef = yield* openReefVoyage;
			const alpha = yield* domain.voyages.charterPiece({
				charter: "sound the shallows",
				dependsOn: [],
				expectation: "soundings are landed",
				role: "hand",
				title: "alpha",
				voyageId: reef.id,
			});
			yield* domain.voyages.launch(alpha.id);

			const agentId = yield* eventually(crewOf(alpha.id));
			const charter = yield* eventually(charterDelivered(scripted, agentId));
			expect(charter).toContain(`your moorage, /tmp/moorage/${agentId}.`);
			expect(charter).toContain(`Reef-Charts — ./berth-0 — branch work/${agentId.slice(0, 8)}/berth-0`);
			expect(charter).toContain("Make repository changes inside the assigned berth's folder");
			expect(charter).not.toContain("`open_change`");
		}).pipe(Effect.provide(dispatchingLayer(temporary, scripted.backend, PATIENCE, {}, recorder.runner)));
	}),
);
