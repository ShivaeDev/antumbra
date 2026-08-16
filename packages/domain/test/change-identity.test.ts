import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AgentDomain } from "#domain.ts";
import { reefWithPiece } from "#test/change-fixtures.ts";
import {
	acquireTemporaryPersistence,
	changeHostsOf,
	domainKernelLayer,
	makeScriptedBackend,
	passiveRunner,
} from "#test/harness.ts";
import { makeScriptedHost } from "#test/scripted-host.ts";

it.live("the same host id in two repositories remains two changes", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		const scripted = yield* makeScriptedHost();
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const { piece, repo, voyage } = yield* reefWithPiece;
			const shoals = yield* domain.repos.register({
				defaultRef: "main",
				source: "/somewhere/shoals",
			});
			const second = yield* domain.voyages.charterPiece({
				charter: "sound the shoals",
				dependsOn: [],
				expectation: "the shoals are charted",
				role: "hand",
				title: "bravo",
				voyageId: voyage.id,
			});
			const url = "https://scripted.test/changes/77";

			const reef = yield* domain.changes.adopt({
				agentId: "agent-crew",
				pieceId: piece.id,
				repoName: repo.name,
				url,
			});
			const shoal = yield* domain.changes.adopt({
				agentId: "agent-crew",
				pieceId: second.id,
				repoName: shoals.name,
				url,
			});

			expect(shoal.id).not.toBe(reef.id);
			expect(shoal.repoId).toBe(shoals.id);
			expect(yield* db.Change.all()).toHaveLength(2);
		}).pipe(
			Effect.provide(
				domainKernelLayer(
					temporary,
					backend.backend,
					{},
					passiveRunner,
					changeHostsOf(scripted.host),
				),
			),
		);
	}),
);
