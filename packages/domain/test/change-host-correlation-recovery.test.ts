import { Database } from "@antumbra/persistence";
import {
	ChangeHostUnavailable,
	type OpenChangeRequest,
} from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AgentDomain } from "#domain.ts";
import { berthed, reefWithPiece } from "#test/change-fixtures.ts";
import { CREW, HEAD } from "#test/change-submission-fixtures.ts";
import {
	acquireTemporaryPersistence,
	changeHostsOf,
	domainKernelLayer,
	makeScriptedBackend,
	passiveRunner,
} from "#test/harness.ts";
import {
	makeScriptedHost,
	makeScriptedHostTruth,
	type ScriptedHost,
} from "#test/scripted-host.ts";

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

const loseAcceptedResponse = (scripted: ScriptedHost) => ({
	...scripted.host,
	open: (request: OpenChangeRequest) =>
		scripted.host.open(request).pipe(
			Effect.andThen(
				new ChangeHostUnavailable({
					detail: "response lost after acceptance",
					host: scripted.host.tag,
				}),
			),
		),
});

it.live(
	"rebuild retries one submitted change without opening another host change",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const backend = yield* makeScriptedBackend;
			const truth = yield* makeScriptedHostTruth;
			const firstAdapter = yield* makeScriptedHost({ truth });
			const first = yield* Effect.gen(function* () {
				const db = yield* Database;
				const { piece, repo } = yield* reefWithPiece;
				yield* berthed(CREW);
				const failure = yield* Effect.flip(
					openWith(piece.id, repo.name, {
						base: "trunk",
						body: "frozen body",
						draft: true,
						title: "frozen title",
					}),
				);
				expect(failure._tag).toBe("ChangeHostUnavailable");
				const changes = yield* db.Change.all();
				expect(changes).toHaveLength(1);
				const prepared = changes[0];
				if (prepared === undefined) {
					return yield* Effect.die("the prepared Change was not persisted");
				}
				expect(prepared.stage).toBe("prepared");
				return { pieceId: piece.id, prepared, repoName: repo.name };
			}).pipe(
				Effect.provide(
					domainKernelLayer(
						temporary,
						backend.backend,
						{},
						passiveRunner,
						changeHostsOf(loseAcceptedResponse(firstAdapter)),
					),
				),
			);

			const secondAdapter = yield* makeScriptedHost({ truth });
			const rebuilt = yield* Effect.gen(function* () {
				const db = yield* Database;
				const row = yield* openWith(first.pieceId, first.repoName, {
					base: "changed-base",
					body: "changed body",
					draft: false,
					title: "changed title",
				});
				return {
					changes: yield* db.Change.all(),
					links: yield* db.PieceChange.all(),
					row,
				};
			}).pipe(
				Effect.provide(
					domainKernelLayer(
						temporary,
						backend.backend,
						{},
						passiveRunner,
						changeHostsOf(secondAdapter.host),
					),
				),
			);

			const attempts = [
				...(yield* firstAdapter.drive.attempted),
				...(yield* secondAdapter.drive.attempted),
			];
			expect(attempts).toHaveLength(2);
			expect(attempts[1]).toEqual(attempts[0]);
			expect(attempts[0]).toMatchObject({
				base: "trunk",
				body: "frozen body",
				draft: true,
				headSha: `sha-${HEAD}`,
				submissionId: first.prepared.id,
				title: "frozen title",
			});
			expect(yield* firstAdapter.drive.opened).toHaveLength(1);
			expect(yield* secondAdapter.drive.opened).toHaveLength(0);
			expect(rebuilt.changes).toHaveLength(1);
			expect(rebuilt.links).toEqual([
				{
					changeId: first.prepared.id,
					pieceId: first.pieceId,
					purpose: "produces",
				},
			]);
			expect(rebuilt.row).toMatchObject({
				baseRef: "trunk",
				body: "frozen body",
				draftAt: first.prepared.draftAt,
				externalId: "1",
				headRef: HEAD,
				headSha: `sha-${HEAD}`,
				id: first.prepared.id,
				preparedHeadRef: HEAD,
				preparedHeadSha: `sha-${HEAD}`,
				stage: "open",
				title: "frozen title",
				worktreePath: `/tmp/moorage/${CREW}/berth-0`,
			});
		}),
);
