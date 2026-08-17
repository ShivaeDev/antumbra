import { Database, Writer } from "@antumbra/persistence";
import type { Runner } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Option, Result } from "effect";
import { AgentDomain } from "#domain.ts";
import { REEF_SOURCE, reefWithPiece } from "#test/change-fixtures.ts";
import {
	acquireTemporaryPersistence,
	changeHostsOf,
	domainKernelLayer,
	makeScriptedBackend,
	passiveRunner,
} from "#test/harness.ts";
import { makeScriptedHost } from "#test/scripted-host.ts";

const AGENT_ID = "agent-claimed";
const BERTH_ID = `${AGENT_ID}:berth-0`;

const seedRetiredBerth = Effect.gen(function* () {
	const db = yield* Database;
	const writer = yield* Writer;
	yield* writer.write(
		Effect.all([
			db.Agent.create({
				charter: "preserve cleanup ownership",
				id: AGENT_ID,
				role: "keeper",
				status: "retired",
			}),
			db.Moorage.create({
				agentId: AGENT_ID,
				reclaimState: null,
				root: `/tmp/moorage/${AGENT_ID}`,
				runner: "local",
				status: "ready",
			}),
			db.Berth.create({
				agentId: AGENT_ID,
				branch: `work/${AGENT_ID}/berth-0`,
				id: BERTH_ID,
				path: `/tmp/moorage/${AGENT_ID}/berth-0`,
				reclaimState: null,
				ref: "main",
				runner: "local",
				slug: "berth-0",
				source: REEF_SOURCE,
				status: "ready",
				strandedAt: null,
			}),
		]),
	);
});

it.live(
	"a durable cleanup claim excludes change preparation before runner effects",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const backend = yield* makeScriptedBackend;
			const host = yield* makeScriptedHost();
			const reachedRunner = yield* Deferred.make<void>();
			const releaseRunner = yield* Deferred.make<void>();
			const runner: Runner = {
				...passiveRunner,
				reclaim: () =>
					Deferred.succeed(reachedRunner, undefined).pipe(
						Effect.andThen(Deferred.await(releaseRunner)),
						Effect.as({ _tag: "reclaimed" as const }),
					),
			};
			yield* Effect.gen(function* () {
				const domain = yield* AgentDomain;
				const { piece, repo } = yield* reefWithPiece;
				yield* seedRetiredBerth;
				const cleanup = yield* Effect.forkScoped(domain.retryResourceReclaim);
				yield* Deferred.await(reachedRunner);
				const db = yield* Database;
				expect(
					(yield* db.Moorage.where({ agentId: AGENT_ID }).first()).pipe(
						Option.getOrThrow,
					).reclaimState,
				).toBe("claimed");
				expect(
					(yield* db.Berth.where({ id: BERTH_ID }).first()).pipe(
						Option.getOrThrow,
					).reclaimState,
				).toBe("claimed");
				const prepared = yield* Effect.result(
					domain.changes.submit({
						agentId: AGENT_ID,
						pieceId: piece.id,
						repoName: repo.name,
					}),
				);
				yield* Deferred.succeed(releaseRunner, undefined);
				yield* Fiber.join(cleanup);
				expect(Result.isFailure(prepared)).toBe(true);
				if (Result.isFailure(prepared)) {
					expect(prepared.failure).toMatchObject({
						_tag: "ResourceReclaimClaimed",
						agentId: AGENT_ID,
					});
				}
			}).pipe(
				Effect.provide(
					domainKernelLayer(
						temporary,
						backend.backend,
						{},
						runner,
						changeHostsOf(host.host),
					),
				),
			);
		}),
);
