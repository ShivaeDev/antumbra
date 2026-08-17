import { Database, Writer } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AgentDomain } from "#domain.ts";
import { changeOf } from "#test/change-fixtures.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
} from "#test/harness.ts";

const SOURCE = "/somewhere/change-storage-boundary";

const withDomain = <A, E, R>(program: Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		return yield* program.pipe(
			Effect.provide(domainKernelLayer(temporary, scripted.backend)),
		);
	});

const registeredRepo = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	return yield* domain.repos.register({ defaultRef: "main", source: SOURCE });
});

const storeUnsafeChangeBerth = (repoId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		yield* writer.write(
			Effect.gen(function* () {
				yield* db.Berth.create({
					agentId: "agent-gone",
					branch: "work/agent/reef",
					id: "berth-unsafe",
					path: "/tmp/unsafe-berth",
					reclaimState: null,
					ref: "main",
					runner: "local",
					slug: "reef",
					source: SOURCE,
					status: "ready",
					strandedAt: null,
				});
				yield* db.Change.create({
					...changeOf({
						headRef: "work/agent/reef",
						id: "change-invalid",
						repoId,
						stage: "open",
					}),
					checks: "future_checks",
				});
			}),
		);
	});

const storeUnsafePieceChangeBerth = (repoId: string, pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		yield* writer.write(
			Effect.gen(function* () {
				yield* db.Berth.create({
					agentId: "agent-gone",
					branch: "work/agent/reef",
					id: "berth-unsafe-piece-change",
					path: "/tmp/unsafe-piece-change-berth",
					reclaimState: null,
					ref: "main",
					runner: "local",
					slug: "reef-piece-change",
					source: SOURCE,
					status: "ready",
					strandedAt: null,
				});
				yield* db.Change.create(
					changeOf({
						headRef: "work/agent/reef",
						id: "change-invalid-piece-link",
						repoId,
						stage: "open",
					}),
				);
				yield* db.PieceChange.create({
					changeId: "change-invalid-piece-link",
					pieceId,
					purpose: "future_purpose",
				});
			}),
		);
	});

it.live("a direct Change read fails typed on invalid durable vocabulary", () =>
	withDomain(
		Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const writer = yield* Writer;
			const repo = yield* registeredRepo;
			yield* writer.write(
				db.Change.create({
					...changeOf({
						headRef: "work/agent/reef",
						id: "change-invalid",
						repoId: repo.id,
						stage: "open",
					}),
					stage: "future_stage",
				}),
			);

			const failure = yield* Effect.flip(domain.voyages.list);
			expect(failure).toMatchObject({
				_tag: "StoredChangeInvalid",
				changeId: "change-invalid",
			});
		}),
	),
);

it.live("a direct PieceChange read fails typed on invalid purpose", () =>
	withDomain(
		Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const writer = yield* Writer;
			const repo = yield* registeredRepo;
			const voyage = yield* domain.voyages.open({
				backend: "scripted",
				context: "the reef is uncharted",
				name: "Chart the reef",
				northStar: "every shoal is known",
			});
			const piece = yield* domain.voyages.charterPiece({
				charter: "sound the shallows",
				dependsOn: [],
				expectation: "soundings are landed",
				role: "hand",
				title: "soundings",
				voyageId: voyage.id,
			});
			yield* writer.write(
				Effect.gen(function* () {
					yield* db.Change.create(
						changeOf({
							headRef: "work/agent/reef",
							id: "change-valid",
							repoId: repo.id,
							stage: "open",
						}),
					);
					yield* db.PieceChange.create({
						changeId: "change-valid",
						pieceId: piece.id,
						purpose: "future_purpose",
					});
				}),
			);

			const failure = yield* Effect.flip(domain.voyages.list);
			expect(failure).toMatchObject({
				_tag: "StoredPieceChangeInvalid",
				changeId: "change-valid",
				pieceId: piece.id,
			});
		}),
	),
);

it.live(
	"boot recovery leaves a berth unchanged behind invalid Change truth",
	() =>
		withDomain(
			Effect.gen(function* () {
				const db = yield* Database;
				const domain = yield* AgentDomain;
				const repo = yield* registeredRepo;
				yield* storeUnsafeChangeBerth(repo.id);

				yield* domain.retryResourceReclaim;
				const [berth] = yield* db.Berth.where({ id: "berth-unsafe" }).all();
				expect(berth?.status).toBe("ready");
				expect(berth?.strandedAt).toBeNull();
			}),
		),
);

it.live(
	"boot recovery holds a berth behind invalid PieceChange truth before reclaim",
	() =>
		withDomain(
			Effect.gen(function* () {
				const db = yield* Database;
				const domain = yield* AgentDomain;
				const repo = yield* registeredRepo;
				const voyage = yield* domain.voyages.open({
					backend: "scripted",
					context: "the reef is uncharted",
					name: "Chart the reef",
					northStar: "every shoal is known",
				});
				const piece = yield* domain.voyages.charterPiece({
					charter: "sound the shallows",
					dependsOn: [],
					expectation: "soundings are landed",
					role: "hand",
					title: "soundings",
					voyageId: voyage.id,
				});
				yield* storeUnsafePieceChangeBerth(repo.id, piece.id);
				yield* domain.retryResourceReclaim;
				const [berth] = yield* db.Berth.where({
					id: "berth-unsafe-piece-change",
				}).all();
				expect(berth?.status).toBe("ready");
				expect(berth?.strandedAt).toBeNull();
			}),
		),
);
