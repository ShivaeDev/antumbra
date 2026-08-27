import {
	type IntentStatus,
	isTerminalIntentStatus,
	Kernel,
} from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import {
	type MooragePlan,
	type Runner,
	RunnerAuthRequired,
	RunnerProvisionConflict,
} from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Ref, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
	makeScriptedRunner,
} from "#test/harness.ts";

const authPayload: SpawnFields = {
	agentId: "agent-auth",
	backend: "scripted",
	charter: "wait for the credential",
	pieceId: "piece-auth",
	role: "test hand",
	runner: "local",
	sessionId: "session-auth",
};

const AUTH_REQUIRED = new RunnerAuthRequired({
	detail: "credential locked",
	tag: "local",
});

const PROVISION_CONFLICT = new RunnerProvisionConflict({
	detail: "planned path has conflicting identity",
	tag: "local",
});

const requireFirst =
	<E>(failure: E) =>
	(attempted: ReadonlyArray<MooragePlan>) =>
		attempted.length === 0 ? Effect.fail(failure) : Effect.void;

const until = <E, R>(
	changes: Stream.Stream<IntentStatus, E, R>,
	predicate: (status: IntentStatus) => boolean,
) =>
	changes.pipe(
		Stream.takeUntil(predicate),
		Stream.runLast,
		Effect.map(Option.getOrThrow),
	);

const pieceAssignments = Effect.gen(function* () {
	const db = yield* Database;
	return (yield* db.PieceAgent.all()).map(({ agentId, pieceId }) => ({
		agentId,
		pieceId,
	}));
});

const agentStatus = (id: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return Option.getOrThrow(yield* db.Agent.where({ id }).first()).status;
	});

it.live(
	"authentication wait survives a full rebuild and retries the same birth",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const backend = yield* makeScriptedBackend;
			const recorded = yield* makeScriptedRunner;
			const attempts = yield* Ref.make<ReadonlyArray<MooragePlan>>([]);
			const runner: Runner = {
				...recorded.runner,
				provision: (plan) =>
					Ref.getAndUpdate(attempts, (all) => [...all, plan]).pipe(
						Effect.flatMap(requireFirst(AUTH_REQUIRED)),
						Effect.andThen(recorded.runner.provision(plan)),
					),
			};
			const intentId = yield* Effect.gen(function* () {
				const db = yield* Database;
				const kernel = yield* Kernel;
				const domain = yield* AgentDomain;
				yield* domain.repos.register({
					defaultRef: "main",
					source: "/somewhere/auth",
				});
				const submission = yield* kernel.submit(domain.spawn, authPayload);
				expect(
					yield* until(submission.changes, (status) => status === "waiting"),
				).toBe("waiting");
				expect(
					Option.getOrThrow(
						yield* db.Moorage.where({ agentId: authPayload.agentId }).first(),
					).status,
				).toBe("provisioning");
				expect(
					(yield* db.Berth.where({ agentId: authPayload.agentId }).all()).map(
						(berth) => berth.status,
					),
				).toEqual(["provisioning"]);
				expect(yield* pieceAssignments).toEqual([
					{ agentId: authPayload.agentId, pieceId: authPayload.pieceId },
				]);
				return submission.id;
			}).pipe(
				Effect.provide(
					domainKernelLayer(temporary, backend.backend, {}, runner),
				),
			);

			// why: this is a second persistence, domain, and kernel Layer lifetime;
			// nothing from the first scheduler or database service survives it.
			yield* Effect.gen(function* () {
				const db = yield* Database;
				const kernel = yield* Kernel;
				const domain = yield* AgentDomain;
				expect(
					Option.getOrThrow(yield* db.Intent.where({ id: intentId }).first())
						.status,
				).toBe("waiting");
				expect(yield* agentStatus(authPayload.agentId)).toBe("spawning");
				expect(yield* pieceAssignments).toEqual([
					{ agentId: authPayload.agentId, pieceId: authPayload.pieceId },
				]);
				yield* domain.repos.register({
					defaultRef: "main",
					source: "/somewhere/registered-after-wait",
				});
				yield* kernel.retry(intentId);
				expect(
					yield* until(kernel.changes(intentId), isTerminalIntentStatus),
				).toBe("succeeded");
				const tried = yield* Ref.get(attempts);
				expect(tried).toHaveLength(2);
				expect(tried[1]).toEqual(tried[0]);
				expect((yield* db.Agent.all()).map((row) => row.id)).toEqual([
					authPayload.agentId,
				]);
				expect((yield* db.Intent.all()).map((row) => row.id)).toEqual([
					intentId,
				]);
				expect(
					Option.getOrThrow(
						yield* db.Moorage.where({ agentId: authPayload.agentId }).first(),
					).status,
				).toBe("ready");
			}).pipe(
				Effect.provide(
					domainKernelLayer(temporary, backend.backend, {}, runner),
				),
			);
		}),
);

it.live("a provision conflict holds the same plan for explicit retry", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		const attempts = yield* Ref.make<ReadonlyArray<MooragePlan>>([]);
		const runner: Runner = {
			...recorded.runner,
			provision: (plan) =>
				Ref.getAndUpdate(attempts, (all) => [...all, plan]).pipe(
					Effect.flatMap(requireFirst(PROVISION_CONFLICT)),
					Effect.andThen(recorded.runner.provision(plan)),
				),
		};
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const kernel = yield* Kernel;
			const domain = yield* AgentDomain;
			yield* domain.repos.register({
				defaultRef: "main",
				source: "/somewhere/conflict",
			});
			const submission = yield* kernel.submit(domain.spawn, {
				...authPayload,
				agentId: "agent-conflict",
				pieceId: "piece-conflict",
				sessionId: "session-conflict",
			});
			expect(
				yield* until(
					submission.changes,
					(status) => status === "waiting" || isTerminalIntentStatus(status),
				),
			).toBe("waiting");
			const held = Option.getOrThrow(
				yield* db.Intent.where({ id: submission.id }).first(),
			);
			expect(held.detail).toContain("provision conflict");
			expect(yield* agentStatus("agent-conflict")).toBe("spawning");
			yield* kernel.retry(submission.id);
			expect(
				yield* until(kernel.changes(submission.id), isTerminalIntentStatus),
			).toBe("succeeded");
			const tried = yield* Ref.get(attempts);
			expect(tried).toHaveLength(2);
			expect(tried[1]).toEqual(tried[0]);
		}).pipe(
			Effect.provide(domainKernelLayer(temporary, backend.backend, {}, runner)),
		);
	}),
);
