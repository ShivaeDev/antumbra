import { type IntentStatus, Kernel } from "@antumbra/kernel";
import { Database, Writer } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Result, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import { REEF_SOURCE, reefWithPiece } from "#test/change-fixtures.ts";
import {
	acquireTemporaryPersistence,
	changeHostsOf,
	domainKernelLayer,
	makeScriptedBackend,
	passiveRunner,
} from "#test/harness.ts";
import { makeScriptedHost, scriptedObservation } from "#test/scripted-host.ts";

const TERMINAL: ReadonlySet<IntentStatus> = new Set([
	"cancelled",
	"failed",
	"succeeded",
]);

const untilTerminal = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(
		Stream.takeUntil((status) => TERMINAL.has(status)),
		Stream.runLast,
		Effect.map(Option.getOrThrow),
	);

const seedAgentResources = (agentId: string, status: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		yield* writer.write(
			Effect.all([
				db.Agent.create({
					charter: "claimed resources open no work",
					id: agentId,
					role: "keeper",
					status,
				}),
				db.Moorage.create({
					agentId,
					reclaimState: null,
					root: `/tmp/moorage/${agentId}`,
					runner: "local",
					status: "ready",
				}),
				db.Berth.create({
					agentId,
					branch: `work/${agentId}/berth-0`,
					id: `${agentId}:berth-0`,
					path: `/tmp/moorage/${agentId}/berth-0`,
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

const claimAgentResources = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		yield* writer.write(
			db.Moorage.where({ agentId })
				.update({ reclaimState: "claimed" })
				.pipe(
					Effect.andThen(
						db.Berth.where({ agentId }).update({
							reclaimState: "claimed",
						}),
					),
				),
		);
	});

const expectClaimed = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const result = yield* Effect.result(effect);
		expect(Result.isFailure(result)).toBe(true);
		if (Result.isFailure(result)) {
			expect(result.failure).toMatchObject({
				_tag: "ResourceReclaimClaimed",
			});
		}
	});

it.live(
	"prepare, open authorization, adoption, and observation reject a claim",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const backend = yield* makeScriptedBackend;
			const host = yield* makeScriptedHost();
			yield* Effect.gen(function* () {
				const domain = yield* AgentDomain;
				const { piece, repo } = yield* reefWithPiece;
				yield* seedAgentResources("agent-boundary", "alive");
				yield* domain.changes.submit({
					agentId: "agent-boundary",
					pieceId: piece.id,
					repoName: repo.name,
				});
				yield* claimAgentResources("agent-boundary");

				yield* expectClaimed(
					domain.changes.open({
						agentId: "agent-boundary",
						base: null,
						body: "must not open",
						draft: false,
						pieceId: piece.id,
						repoName: repo.name,
						title: "claimed",
					}),
				);
				yield* expectClaimed(
					domain.changes.adopt({
						agentId: "agent-boundary",
						pieceId: piece.id,
						repoName: repo.name,
						url: "https://scripted.test/changes/41",
					}),
				);
				yield* expectClaimed(
					domain.changes.observed("scripted", [
						scriptedObservation("scripted", "41", {
							baseRef: "main",
							headRef: `work/agent-boundary/berth-0`,
							repoId: repo.id,
							title: "claimed",
						}),
					]),
				);
			}).pipe(
				Effect.provide(
					domainKernelLayer(
						temporary,
						backend.backend,
						{},
						passiveRunner,
						changeHostsOf(host.host),
					),
				),
			);
		}),
);

it.live("spawn cannot write a new assignment through claimed resources", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const { piece } = yield* reefWithPiece;
			yield* seedAgentResources("agent-assignment", "spawning");
			yield* claimAgentResources("agent-assignment");
			const spawn = yield* kernel.submit(domain.spawn, {
				agentId: "agent-assignment",
				backend: "scripted",
				charter: "must not be assigned",
				pieceId: piece.id,
				role: "keeper",
				runner: "local",
				sessionId: "session-assignment",
			});
			expect(yield* untilTerminal(spawn.changes)).toBe("failed");
			expect(
				yield* db.PieceAgent.where({
					agentId: "agent-assignment",
					pieceId: piece.id,
				}).all(),
			).toEqual([]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, backend.backend)));
	}),
);
