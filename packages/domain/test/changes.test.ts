import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option, PubSub, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import { berthed, reefWithPiece } from "#test/change-fixtures.ts";
import {
	CREW,
	HEAD,
	openedChange,
	withHost,
} from "#test/change-submission-fixtures.ts";
import {
	acquireTemporaryPersistence,
	changeHostsOf,
	domainKernelLayer,
	makeScriptedBackend,
	passiveRunner,
} from "#test/harness.ts";
import { claimsNothingHost, scriptedObservation } from "#test/scripted-host.ts";
import { stateOf } from "#test/voyage-fixtures.ts";

it.live("a change opened by crew is written with the link to its piece", () =>
	withHost((scripted) =>
		Effect.gen(function* () {
			const db = yield* Database;
			const { piece, repo, voyage } = yield* reefWithPiece;
			yield* berthed(CREW);

			const row = yield* openedChange(piece.id, repo.name);
			expect(row.stage).toBe("open");
			expect(row.openedByAgentId).toBe(CREW);
			expect(row.url).toBe("https://scripted.test/changes/1");
			expect(row.headRef).toBe(HEAD);
			expect(row.baseRef).toBe("main");
			expect(row.raw).toBe('{"number":"1","source":"scripted"}');

			expect(yield* db.PieceChange.all()).toEqual([
				{ changeId: row.id, pieceId: piece.id, purpose: "produces" },
			]);
			expect((yield* scripted.drive.opened).length).toBe(1);
			expect(yield* stateOf(voyage.id, piece.id)).toBe("landing");
		}),
	),
);

it.live(
	"a change the record cannot place is refused before any host runs",
	() =>
		withHost((scripted) =>
			Effect.gen(function* () {
				const db = yield* Database;
				const domain = yield* AgentDomain;
				const { piece, repo } = yield* reefWithPiece;

				const noPiece = yield* Effect.flip(
					openedChange("no-such-piece", repo.name),
				);
				expect(noPiece).toMatchObject({
					_tag: "PieceNotFound",
					pieceId: "no-such-piece",
				});
				const noPieceAdoption = yield* Effect.flip(
					domain.changes.adopt({
						agentId: CREW,
						pieceId: "no-such-piece",
						repoName: repo.name,
						url: "https://scripted.test/changes/77",
					}),
				);
				expect(noPieceAdoption).toMatchObject({
					_tag: "PieceNotFound",
					pieceId: "no-such-piece",
				});

				const noRepo = yield* Effect.flip(openedChange(piece.id, "shoals"));
				expect(noRepo._tag).toBe("RepoNotFound");
				expect(noRepo.message).toContain("shoals");

				const noBerth = yield* Effect.flip(openedChange(piece.id, repo.name));
				expect(noBerth._tag).toBe("BerthNotFound");
				expect(noBerth.message).toContain("reef");

				expect(yield* scripted.drive.adopted).toEqual([]);
				expect(yield* scripted.drive.opened).toEqual([]);
				expect(yield* db.Change.all()).toEqual([]);
			}),
		),
);

it.live("a repo no host claims is named in the refusal", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const { piece, repo } = yield* reefWithPiece;
			yield* berthed(CREW);
			const refused = yield* Effect.flip(openedChange(piece.id, repo.name));
			expect(refused._tag).toBe("NoChangeHost");
			expect(refused.message).toBe("no change host claims reef");
		}).pipe(
			Effect.provide(
				domainKernelLayer(
					temporary,
					backend.backend,
					{},
					passiveRunner,
					changeHostsOf(claimsNothingHost("indifferent")),
				),
			),
		);
	}),
);

it.live(
	"adopting the same change twice is one row and one link per piece",
	() =>
		withHost(() =>
			Effect.gen(function* () {
				const db = yield* Database;
				const domain = yield* AgentDomain;
				const { piece, repo, voyage } = yield* reefWithPiece;
				const second = yield* domain.voyages.charterPiece({
					charter: "draw the chart",
					dependsOn: [],
					expectation: "the chart is landed",
					role: "cartographer",
					title: "bravo",
					voyageId: voyage.id,
				});
				const url = "https://scripted.test/changes/77";
				const adopt = (pieceId: string) =>
					domain.changes.adopt({
						agentId: CREW,
						pieceId,
						repoName: repo.name,
						url,
					});

				const first = yield* adopt(piece.id);
				expect(yield* adopt(piece.id)).toEqual(first);
				const shared = yield* adopt(second.id);
				expect(shared.id).toBe(first.id);

				expect((yield* db.Change.all()).length).toBe(1);
				expect((yield* db.PieceChange.all()).length).toBe(2);
				expect(first.externalId).toBe("77");
				expect(first.body).toBe("");
			}),
		),
);

it.live("a landed change flips its piece done and wakes the voyage feed", () =>
	withHost((scripted) =>
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const feeds = yield* DomainFeeds;
			const { piece, repo, voyage } = yield* reefWithPiece;
			yield* berthed(CREW);
			const row = yield* openedChange(piece.id, repo.name);

			yield* scripted.drive.transition(repo.id, "1", {
				checks: "green",
				mergeable: "clean",
				review: "approved",
				stage: "landed",
			});
			// why: a host answers about more than it was asked, and an id nothing
			// here points at is ignored rather than adopted by drift.
			yield* scripted.drive.announce(
				scriptedObservation("scripted", "stranger", {
					baseRef: "main",
					headRef: "work/somebody-else",
					repoId: repo.id,
					title: "not ours",
				}),
			);

			const heard = yield* Effect.scoped(
				Effect.gen(function* () {
					const subscription = yield* PubSub.subscribe(feeds.voyages);
					yield* domain.changes.refresh("scripted");
					return yield* Stream.fromSubscription(subscription).pipe(
						Stream.take(1),
						Stream.runCollect,
						Effect.timeoutOption(1000),
					);
				}),
			);
			expect(Option.isSome(heard)).toBe(true);

			const view = Option.getOrThrow(yield* domain.voyages.read(voyage.id));
			const seen = view.pieces.find((row) => row.id === piece.id);
			expect(seen?.state).toBe("done");
			expect(seen?.changes).toHaveLength(1);
			expect(seen?.changes.at(0)).toMatchObject({
				checks: "green",
				externalId: "1",
				host: "scripted",
				id: row.id,
				isDraft: false,
				mergeable: "clean",
				repoId: repo.id,
				repoName: repo.name,
				review: "approved",
				stage: "landed",
				title: "chart the eastern spit",
				url: "https://scripted.test/changes/1",
			});
			expect(yield* stateOf(voyage.id, piece.id)).toBe("done");
		}),
	),
);

// why: history is appended, never mutated — a host that reports a settled
// change open again is describing a world already accounted for.
it.live("a change that has landed never goes back to open", () =>
	withHost((scripted) =>
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const { piece, repo, voyage } = yield* reefWithPiece;
			yield* berthed(CREW);
			yield* openedChange(piece.id, repo.name);
			yield* scripted.drive.transition(repo.id, "1", { stage: "landed" });
			const landed = (yield* domain.changes.refresh("scripted"))[0];
			expect(landed?.stage).toBe("landed");

			const stood = (yield* domain.changes.observed("scripted", [
				scriptedObservation("scripted", "1", {
					baseRef: "main",
					headRef: HEAD,
					repoId: repo.id,
					title: "chart the eastern spit",
				}),
			]))[0];
			expect(stood?.stage).toBe("landed");
			expect(stood?.landedAt).toEqual(landed?.landedAt);
			expect(yield* stateOf(voyage.id, piece.id)).toBe("done");
		}),
	),
);
