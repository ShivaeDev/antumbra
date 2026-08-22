import { type IntentStatus, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import type { Runner } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Option, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
	makeScriptedRunner,
} from "#test/harness.ts";
import { eventually } from "#test/session-recovery-fixture.ts";

const payload: SpawnFields = {
	agentId: "agent-cancel",
	backend: "scripted",
	charter: "cancel this setup",
	pieceId: "piece-cancel",
	role: "test hand",
	runner: "local",
	sessionId: "session-cancel",
};

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

it.live(
	"explicit cancel settles one spawning birth and its incomplete plan",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			const recorded = yield* makeScriptedRunner;
			const provisioning = yield* Deferred.make<void>();
			const hold = yield* Deferred.make<void>();
			const runner: Runner = {
				...recorded.runner,
				provision: () =>
					Deferred.succeed(provisioning, undefined).pipe(
						Effect.andThen(Deferred.await(hold)),
					),
			};
			yield* Effect.gen(function* () {
				const db = yield* Database;
				const kernel = yield* Kernel;
				const domain = yield* AgentDomain;
				yield* domain.repos.register({
					defaultRef: "main",
					source: "/somewhere/cancel",
				});
				const submission = yield* kernel.submit(domain.spawn, payload);
				yield* Deferred.await(provisioning);
				yield* kernel.cancel(submission.id);
				expect(yield* untilTerminal(submission.changes)).toBe("cancelled");
				const agent = Option.getOrThrow(
					yield* db.Agent.where({ id: payload.agentId }).first(),
				);
				expect(agent.status).toBe("dormant");
				expect(
					Option.getOrThrow(
						yield* db.Moorage.where({ agentId: payload.agentId }).first(),
					).status,
				).toBe("provisioning");
				expect(
					(yield* db.Berth.where({ agentId: payload.agentId }).all()).map(
						(berth) => berth.status,
					),
				).toEqual(["provisioning"]);
				expect((yield* db.Agent.all()).map((row) => row.id)).toEqual([
					payload.agentId,
				]);
				expect((yield* db.Intent.all()).map((row) => row.id)).toEqual([
					submission.id,
				]);
				// why: the plan survives because a berth half cut is a thing on disk
				// that reclaim must still come for. The claim on the Piece does not:
				// it was staked for a birth that never drew breath, and settlement
				// withdraws it so the Piece is free of Agents that never served.
				expect(yield* db.PieceAgent.all()).toEqual([]);
				expect(yield* db.AgentSession.all()).toHaveLength(0);
			}).pipe(
				Effect.provide(
					domainKernelLayer(temporary, scripted.backend, {}, runner),
				),
			);
		}),
);

it.live("explicit cancel settles a spawn waiting behind closed admission", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const kernel = yield* Kernel;
			const domain = yield* AgentDomain;
			yield* domain.closeSessionStarts;
			const submission = yield* kernel.submit(domain.spawn, payload);
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* recorded.provisioned).toHaveLength(1);
				}),
			);
			yield* Effect.yieldNow;
			yield* Effect.yieldNow;
			expect(
				Option.getOrThrow(
					yield* db.Agent.where({ id: payload.agentId }).first(),
				).status,
			).toBe("spawning");
			expect(yield* db.AgentSession.all()).toHaveLength(0);
			expect(yield* scripted.opened).toHaveLength(0);

			yield* kernel.cancel(submission.id);
			expect(yield* untilTerminal(submission.changes)).toBe("cancelled");
			expect(
				Option.getOrThrow(
					yield* db.Agent.where({ id: payload.agentId }).first(),
				).status,
			).toBe("dormant");
			expect(yield* db.AgentSession.all()).toHaveLength(0);
			expect(yield* scripted.opened).toHaveLength(0);
		}).pipe(
			Effect.provide(
				domainKernelLayer(temporary, scripted.backend, {}, recorded.runner),
			),
		);
	}),
);
