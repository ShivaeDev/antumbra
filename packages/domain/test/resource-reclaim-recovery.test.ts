import { Database, Writer } from "@antumbra/persistence";
import { type Runner, RunnerFailure } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Ref } from "effect";
import { AgentDomain } from "#domain.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
	passiveRunner,
} from "#test/harness.ts";

interface ResourceSeed {
	readonly agentId: string;
	readonly agentStatus: string;
	readonly moorageStatus: string;
	readonly sessionStatus?: string;
}

const seedResource = (seed: ResourceSeed) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		const berthId = `${seed.agentId}:berth-0`;
		yield* writer.write(
			Effect.gen(function* () {
				yield* db.Agent.create({
					charter: `keep ${seed.agentId} truthful`,
					id: seed.agentId,
					role: "keeper",
					status: seed.agentStatus,
				});
				yield* db.Moorage.create({
					agentId: seed.agentId,
					reclaimState: null,
					root: `/tmp/moorage/${seed.agentId}`,
					runner: "local",
					status: seed.moorageStatus,
				});
				yield* db.Berth.create({
					agentId: seed.agentId,
					branch: `work/${seed.agentId}/berth-0`,
					id: berthId,
					path: `/tmp/moorage/${seed.agentId}/berth-0`,
					reclaimState: null,
					ref: "main",
					runner: "local",
					slug: "berth-0",
					source: `/somewhere/${seed.agentId}`,
					status: seed.moorageStatus,
					strandedAt: null,
				});
				if (seed.sessionStatus !== undefined) {
					yield* db.AgentSession.create({
						agentId: seed.agentId,
						backend: "scripted",
						charterDeliveredAt: null,
						cwd: `/tmp/moorage/${seed.agentId}`,
						executionStatus: "idle",
						id: `${seed.agentId}:session`,
						nativeRef: null,
						status: seed.sessionStatus,
					});
				}
			}),
		);
		return berthId;
	});

const storedResource = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return {
			berth: Option.getOrThrow(yield* db.Berth.where({ agentId }).first()),
			moorage: Option.getOrThrow(yield* db.Moorage.where({ agentId }).first()),
		};
	});

it.live(
	"a second persistence and Effect lifetime resumes the exact durable claim",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const backend = yield* makeScriptedBackend;
			const seen = yield* Ref.make<ReadonlyArray<string>>([]);
			yield* seedResource({
				agentId: "agent-restart-claim",
				agentStatus: "retired",
				moorageStatus: "ready",
			}).pipe(Effect.provide(temporary.layer));
			const transientFailure = new RunnerFailure({
				detail: "temporary git failure",
				tag: "local",
			});
			const failing: Runner = {
				...passiveRunner,
				reclaim: (site) =>
					Ref.update(seen, (all) => [...all, site.path]).pipe(
						Effect.andThen(transientFailure),
					),
			};
			yield* Effect.provide(
				Effect.void,
				domainKernelLayer(temporary, backend.backend, {}, failing),
			);
			const claimed = yield* storedResource("agent-restart-claim").pipe(
				Effect.provide(temporary.layer),
			);
			expect(claimed.berth.reclaimState).toBe("claimed");
			expect(claimed.moorage.reclaimState).toBe("claimed");

			const recovered: Runner = {
				...passiveRunner,
				reclaim: (site) =>
					Ref.update(seen, (all) => [...all, site.path]).pipe(
						Effect.as({ _tag: "reclaimed" as const }),
					),
			};
			yield* Effect.provide(
				Effect.void,
				domainKernelLayer(temporary, backend.backend, {}, recovered),
			);
			const settled = yield* storedResource("agent-restart-claim").pipe(
				Effect.provide(temporary.layer),
			);
			expect(settled.berth.status).toBe("reclaimed");
			expect(settled.berth.reclaimState).toBeNull();
			expect(settled.moorage.reclaimState).toBeNull();
			expect(yield* Ref.get(seen)).toEqual([
				"/tmp/moorage/agent-restart-claim/berth-0",
				"/tmp/moorage/agent-restart-claim/berth-0",
			]);
		}),
);

it.live("automatic selection is only retired Agents and failed setup", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		const reclaimed = yield* Ref.make<ReadonlyArray<string>>([]);
		const runner: Runner = {
			...passiveRunner,
			reclaim: (site) =>
				Ref.update(reclaimed, (all) => [...all, site.path]).pipe(
					Effect.as({ _tag: "reclaimed" as const }),
				),
		};
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			yield* seedResource({
				agentId: "agent-retired",
				agentStatus: "retired",
				moorageStatus: "ready",
			});
			yield* seedResource({
				agentId: "agent-failed-setup",
				agentStatus: "dormant",
				moorageStatus: "provisioning",
			});
			yield* seedResource({
				agentId: "agent-siesta",
				agentStatus: "dormant",
				moorageStatus: "ready",
				sessionStatus: "open",
			});
			yield* seedResource({
				agentId: "agent-alive",
				agentStatus: "alive",
				moorageStatus: "ready",
				sessionStatus: "open",
			});
			yield* domain.retryResourceReclaim;
		}).pipe(
			Effect.provide(domainKernelLayer(temporary, backend.backend, {}, runner)),
		);
		expect(yield* Ref.get(reclaimed)).toEqual([
			"/tmp/moorage/agent-retired/berth-0",
			"/tmp/moorage/agent-failed-setup/berth-0",
		]);
		const siesta = yield* storedResource("agent-siesta").pipe(
			Effect.provide(temporary.layer),
		);
		expect(siesta.berth.status).toBe("ready");
		expect(siesta.berth.reclaimState).toBeNull();
	}),
);

it.live("an unknown durable claim word holds every external effect", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		const calls = yield* Ref.make(0);
		yield* seedResource({
			agentId: "agent-unknown-claim",
			agentStatus: "retired",
			moorageStatus: "ready",
		}).pipe(Effect.provide(temporary.layer));
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			yield* writer.write(
				db.Berth.where({ agentId: "agent-unknown-claim" }).update({
					reclaimState: "future-claim",
				}),
			);
		}).pipe(Effect.provide(temporary.layer));
		const runner: Runner = {
			...passiveRunner,
			reclaim: () =>
				Ref.update(calls, (count) => count + 1).pipe(
					Effect.as({ _tag: "reclaimed" as const }),
				),
		};
		yield* Effect.provide(
			Effect.void,
			domainKernelLayer(temporary, backend.backend, {}, runner),
		);
		expect(yield* Ref.get(calls)).toBe(0);
		const stored = yield* storedResource("agent-unknown-claim").pipe(
			Effect.provide(temporary.layer),
		);
		expect(stored.berth.reclaimState).toBe("future-claim");
	}),
);
