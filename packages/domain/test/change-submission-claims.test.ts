import { Database, Writer } from "@antumbra/persistence";
import type { ChangeObservation } from "@antumbra/plugin-api";
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

const OTHER = "agent-other";

const charterSecondPiece = (voyageId: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		return yield* domain.voyages.charterPiece({
			charter: "sound the second channel",
			dependsOn: [],
			expectation: "the second sounding is landed",
			role: "surveyor",
			title: "beta",
			voyageId,
		});
	});

it.live(
	"an exact adoption cannot transfer another Agent's prepared claim",
	() =>
		withHost((scripted) =>
			Effect.gen(function* () {
				const db = yield* Database;
				const domain = yield* AgentDomain;
				const writer = yield* Writer;
				const { piece, repo, voyage } = yield* reefWithPiece;
				const otherPiece = yield* charterSecondPiece(voyage.id);
				yield* berthed(CREW);
				yield* berthed(OTHER);
				yield* writer.write(
					db.Berth.where({ agentId: OTHER }).update({ branch: HEAD }),
				);
				const own = yield* domain.changes.submit({
					agentId: CREW,
					pieceId: piece.id,
					repoName: repo.name,
				});
				const foreign = yield* domain.changes.submit({
					agentId: OTHER,
					pieceId: otherPiece.id,
					repoName: repo.name,
				});
				const exact = {
					...scriptedObservation("scripted", "88", {
						baseRef: "main",
						headRef: HEAD,
						repoId: repo.id,
						title: "opened outside Antumbra",
					}),
					headSha: `sha-${HEAD}`,
				};
				yield* scripted.drive.announce(exact);

				const adopted = yield* domain.changes.adopt({
					agentId: CREW,
					pieceId: piece.id,
					repoName: repo.name,
					url: exact.url,
				});

				expect(adopted.id).toBe(own.id);
				const changes = yield* db.Change.all();
				expect(changes).toHaveLength(2);
				expect(changes.find((row) => row.id === own.id)).toMatchObject({
					externalId: "88",
					stage: "open",
				});
				expect(changes.find((row) => row.id === foreign.id)).toMatchObject({
					externalId: null,
					stage: "prepared",
					submissionKey: foreign.submissionKey,
				});
				expect(yield* db.PieceChange.all()).toEqual(
					expect.arrayContaining([
						{ changeId: own.id, pieceId: piece.id, purpose: "produces" },
						{
							changeId: foreign.id,
							pieceId: otherPiece.id,
							purpose: "produces",
						},
					]),
				);
			}),
		),
);

it.live(
	"open rejects a host observation owned by a foreign submission claim",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const backend = yield* makeScriptedBackend;
			const scripted = yield* makeScriptedHost();
			let foreignObservation: ChangeObservation | null = null;
			const host = {
				...scripted.host,
				open: () =>
					foreignObservation === null
						? Effect.die("foreign observation was not arranged")
						: Effect.succeed(foreignObservation),
			};
			yield* Effect.gen(function* () {
				const db = yield* Database;
				const domain = yield* AgentDomain;
				const { piece, repo, voyage } = yield* reefWithPiece;
				const otherPiece = yield* charterSecondPiece(voyage.id);
				yield* berthed(CREW);
				yield* berthed(OTHER);
				const foreign = yield* domain.changes.submit({
					agentId: OTHER,
					pieceId: otherPiece.id,
					repoName: repo.name,
				});
				foreignObservation = {
					...scriptedObservation("scripted", "41", {
						baseRef: "main",
						headRef: foreign.preparedHeadRef ?? "missing",
						repoId: repo.id,
						title: "foreign proposal",
					}),
					headSha: foreign.preparedHeadSha,
				};

				const conflict = yield* Effect.flip(
					domain.changes.open({
						agentId: CREW,
						base: null,
						body: "own proposal",
						draft: false,
						pieceId: piece.id,
						repoName: repo.name,
						title: "own proposal",
					}),
				);
				expect(conflict._tag).toBe("ChangeObservationConflict");
				const changes = yield* db.Change.all();
				expect(changes).toHaveLength(2);
				expect(changes.every((row) => row.stage === "prepared")).toBe(true);
				expect(changes.find((row) => row.id === foreign.id)).toMatchObject({
					externalId: null,
					submissionKey: foreign.submissionKey,
				});
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
