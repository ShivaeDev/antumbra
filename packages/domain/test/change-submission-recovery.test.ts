import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import {
	ChangeHostUnavailable,
	type OpenChangeRequest,
} from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option, PubSub, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import { berthed, reefWithPiece } from "#test/change-fixtures.ts";
import {
	CREW,
	HEAD,
	openedChange,
	submittedChange,
	withHost,
} from "#test/change-submission-fixtures.ts";
import {
	acquireTemporaryPersistence,
	changeHostsOf,
	domainKernelLayer,
	makeScriptedBackend,
	passiveRunner,
} from "#test/harness.ts";
import {
	makeScriptedHost,
	type ScriptedHost,
	scriptedObservation,
} from "#test/scripted-host.ts";
import { stateOf } from "#test/voyage-fixtures.ts";

interface HostProposal {
	readonly base: string | null;
	readonly body: string;
	readonly draft: boolean;
	readonly title: string;
}

const openWith = (pieceId: string, repoName: string, proposal: HostProposal) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		return yield* domain.changes.open({
			agentId: CREW,
			pieceId,
			repoName,
			...proposal,
		});
	});

const hostThatLosesFirstResponse = (
	scripted: ScriptedHost,
	attempts: Array<OpenChangeRequest>,
) => {
	let loseResponse = true;
	return {
		...scripted.host,
		open: (request: OpenChangeRequest) => {
			attempts.push(request);
			return scripted.host.open(request).pipe(
				Effect.flatMap((observation) => {
					if (!loseResponse) {
						return Effect.succeed(observation);
					}
					loseResponse = false;
					return new ChangeHostUnavailable({
						detail: "response lost after acceptance",
						host: scripted.host.tag,
					});
				}),
			);
		},
	};
};

it.live(
	"a retry cannot replace the proposal frozen before host acceptance",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const backend = yield* makeScriptedBackend;
			const scripted = yield* makeScriptedHost();
			const attempts: Array<OpenChangeRequest> = [];
			const host = hostThatLosesFirstResponse(scripted, attempts);
			yield* Effect.gen(function* () {
				const { piece, repo } = yield* reefWithPiece;
				yield* berthed(CREW);
				const first = {
					base: "trunk",
					body: "first body",
					draft: true,
					title: "first title",
				} as const;
				yield* Effect.flip(openWith(piece.id, repo.name, first));
				yield* openWith(piece.id, repo.name, {
					base: "other",
					body: "changed body",
					draft: false,
					title: "changed title",
				});

				expect(attempts).toHaveLength(2);
				expect(attempts[0]).toMatchObject(first);
				expect(attempts[1]).toMatchObject(first);
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

it.live("manual adoption attaches and lands the submitted change", () =>
	withHost((scripted) =>
		Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const { piece, repo, voyage } = yield* reefWithPiece;
			yield* berthed(CREW);
			const prepared = yield* submittedChange(piece.id, repo.name);
			const exact = {
				...scriptedObservation("scripted", "77", {
					baseRef: "main",
					headRef: HEAD,
					repoId: repo.id,
					title: "opened by hand",
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
			expect(adopted.id).toBe(prepared.id);
			expect(yield* db.Change.all()).toHaveLength(1);

			yield* scripted.drive.transition(repo.id, "77", { stage: "landed" });
			yield* domain.changes.refresh("scripted");
			expect(yield* stateOf(voyage.id, piece.id)).toBe("done");
		}),
	),
);

it.live(
	"a reopened withdrawn change absorbs its exact prepared replacement",
	() =>
		withHost((scripted) =>
			Effect.gen(function* () {
				const db = yield* Database;
				const domain = yield* AgentDomain;
				const { piece, repo, voyage } = yield* reefWithPiece;
				yield* berthed(CREW);
				const first = yield* openedChange(piece.id, repo.name);
				yield* scripted.drive.transition(repo.id, "1", { stage: "withdrawn" });
				yield* domain.changes.refresh("scripted");
				const replacement = yield* submittedChange(piece.id, repo.name);
				expect(replacement.id).not.toBe(first.id);

				yield* scripted.drive.transition(repo.id, "1", { stage: "open" });
				yield* domain.changes.refresh("scripted");
				const reused = yield* submittedChange(piece.id, repo.name);
				expect(reused.id).toBe(first.id);
				expect(yield* db.Change.all()).toHaveLength(1);
				expect(yield* db.PieceChange.all()).toEqual([
					{ changeId: first.id, pieceId: piece.id, purpose: "produces" },
				]);

				yield* scripted.drive.transition(repo.id, "1", { stage: "landed" });
				yield* domain.changes.refresh("scripted");
				expect(yield* stateOf(voyage.id, piece.id)).toBe("done");
			}),
		),
);

it.live("linking another Piece to the active change wakes voyage readers", () =>
	withHost(() =>
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const feeds = yield* DomainFeeds;
			const { piece, repo, voyage } = yield* reefWithPiece;
			yield* berthed(CREW);
			const first = yield* submittedChange(piece.id, repo.name);
			const second = yield* domain.voyages.charterPiece({
				charter: "sound the western spit",
				dependsOn: [],
				expectation: "the sounding shares its change",
				role: "cartographer",
				title: "western sounding",
				voyageId: voyage.id,
			});

			const heard = yield* Effect.scoped(
				Effect.gen(function* () {
					const subscription = yield* PubSub.subscribe(feeds.voyages);
					const linked = yield* submittedChange(second.id, repo.name);
					expect(linked.id).toBe(first.id);
					return yield* Stream.fromSubscription(subscription).pipe(
						Stream.take(1),
						Stream.runCollect,
						Effect.timeoutOption(1000),
					);
				}),
			);
			expect(Option.isSome(heard)).toBe(true);
		}),
	),
);
