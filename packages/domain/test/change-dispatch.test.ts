import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { TestClock } from "effect/testing";
import { AgentDomain } from "#domain.ts";
import { REEF_SOURCE } from "#test/change-fixtures.ts";
import { dispatchingLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, changeHostsOf, makeScriptedBackend, makeScriptedRunner } from "#test/harness.ts";
import { makeScriptedHost } from "#test/scripted-host.ts";
import { assignedPieces, eventually, PATIENCE, retireOneAlive, stateOf } from "#test/voyage-fixtures.ts";

const gatedChain = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const repo = yield* domain.repos.register({
		defaultRef: "main",
		source: REEF_SOURCE,
	});
	const voyage = yield* domain.voyages.open({
		backend: "scripted",
		context: "the reef is uncharted",
		name: "Chart the reef",
		northStar: "every shoal is known",
	});
	const charter = (title: string, dependsOn: ReadonlyArray<string>) =>
		domain.voyages.charterPiece({
			charter: `do ${title}`,
			dependsOn,
			expectation: `${title} is landed`,
			role: "hand",
			title,
			voyageId: voyage.id,
		});
	const alpha = yield* charter("alpha", []);
	const bravo = yield* charter("bravo", [alpha.id]);
	yield* domain.voyages.launch(alpha.id);
	yield* domain.voyages.launch(bravo.id);
	return { alpha, bravo, repo, voyage };
});

const crewOf = (pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = (yield* db.PieceAgent.where({ pieceId }).all())[0];
		return row === undefined ? yield* Effect.fail("no crew yet") : row.agentId;
	});

// why: the whole point of a change as an outcome — a piece whose crew is gone
// but whose change is still open holds its dependents back with nobody at
// work, and the moment the host says it landed the chain sails on with no
// further act from anyone.
it.effect("a landing piece gates its dependents until the change lands", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		const recorder = yield* makeScriptedRunner;
		const scripted = yield* makeScriptedHost();
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const { alpha, bravo, repo, voyage } = yield* gatedChain;
			const crew = yield* TestClock.withLive(eventually(crewOf(alpha.id)));

			yield* domain.changes.open({
				agentId: crew,
				base: null,
				body: "sounded three fathoms",
				draft: false,
				pieceId: alpha.id,
				repoName: "reef",
				sessionId: "session-crew",
				title: "chart the eastern spit",
			});
			yield* retireOneAlive(backend);

			yield* TestClock.withLive(
				eventually(
					Effect.gen(function* () {
						expect(yield* stateOf(voyage.id, alpha.id)).toBe("landing");
					}),
				),
			);
			expect(yield* stateOf(voyage.id, bravo.id)).toBe("blocked");
			yield* TestClock.adjust(400);
			expect(yield* assignedPieces).toEqual([alpha.id]);

			yield* scripted.drive.transition(repo.id, "1", { stage: "landed" });
			yield* domain.changes.refresh("scripted");
			yield* TestClock.withLive(
				eventually(
					Effect.gen(function* () {
						expect(yield* stateOf(voyage.id, alpha.id)).toBe("done");
						expect((yield* assignedPieces).length).toBe(2);
					}),
				),
			);
		}).pipe(Effect.provide(dispatchingLayer(temporary, backend.backend, PATIENCE, {}, recorder.runner, changeHostsOf(scripted.host))));
	}),
);
