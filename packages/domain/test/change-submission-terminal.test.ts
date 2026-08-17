import { Database } from "@antumbra/persistence";
import type { OpenChangeRequest } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AgentDomain } from "#domain.ts";
import { berthed, reefWithPiece } from "#test/change-fixtures.ts";
import { CREW, HEAD, withHost } from "#test/change-submission-fixtures.ts";
import {
	acquireTemporaryPersistence,
	changeHostsOf,
	domainKernelLayer,
	makeScriptedBackend,
	passiveRunner,
} from "#test/harness.ts";
import { makeScriptedHost, scriptedObservation } from "#test/scripted-host.ts";
import { stateOf } from "#test/voyage-fixtures.ts";

it.live("open attaches an exact change already landed by the host", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		const scripted = yield* makeScriptedHost();
		const host = {
			...scripted.host,
			open: (request: OpenChangeRequest) =>
				scripted.host.open(request).pipe(
					Effect.map((observation) => ({
						...observation,
						stage: "landed" as const,
					})),
				),
		};
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const { piece, repo, voyage } = yield* reefWithPiece;
			yield* berthed(CREW);
			const prepared = yield* domain.changes.submit({
				agentId: CREW,
				pieceId: piece.id,
				repoName: repo.name,
			});

			const landed = yield* domain.changes.open({
				agentId: CREW,
				base: null,
				body: "landed before the response returned",
				draft: false,
				pieceId: piece.id,
				repoName: repo.name,
				title: "fast host",
			});

			expect(landed).toMatchObject({
				externalId: "1",
				id: prepared.id,
				stage: "landed",
				submissionKey: null,
			});
			expect(yield* db.Change.all()).toHaveLength(1);
			expect(yield* db.ChangeTransition.all()).toEqual([
				expect.objectContaining({
					changeId: prepared.id,
					fromStage: "prepared",
					toStage: "landed",
				}),
			]);
			expect(yield* scripted.drive.opened).toHaveLength(1);
			expect(yield* stateOf(voyage.id, piece.id)).toBe("done");
		}).pipe(
			Effect.provide(
				domainKernelLayer(
					temporary,
					backend.backend,
					{},
					passiveRunner,
					changeHostsOf(host),
				),
			),
		);
	}),
);

it.live("adopt attaches an exact prepared change already landed by hand", () =>
	withHost((scripted) =>
		Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const { piece, repo, voyage } = yield* reefWithPiece;
			yield* berthed(CREW);
			const prepared = yield* domain.changes.submit({
				agentId: CREW,
				pieceId: piece.id,
				repoName: repo.name,
			});
			const exact = {
				...scriptedObservation("scripted", "91", {
					baseRef: "main",
					headRef: HEAD,
					repoId: repo.id,
					title: "landed by hand",
				}),
				headSha: `sha-${HEAD}`,
				stage: "landed" as const,
			};
			yield* scripted.drive.announce(exact);

			const adopted = yield* domain.changes.adopt({
				agentId: CREW,
				pieceId: piece.id,
				repoName: repo.name,
				url: exact.url,
			});

			expect(adopted).toMatchObject({
				externalId: "91",
				id: prepared.id,
				stage: "landed",
				submissionKey: null,
			});
			expect(yield* db.Change.all()).toHaveLength(1);
			expect(yield* db.ChangeTransition.all()).toEqual([
				expect.objectContaining({
					changeId: prepared.id,
					fromStage: "prepared",
					toStage: "landed",
				}),
			]);
			expect(yield* stateOf(voyage.id, piece.id)).toBe("done");
		}),
	),
);
