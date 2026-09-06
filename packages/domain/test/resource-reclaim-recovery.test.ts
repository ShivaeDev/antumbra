import { Database, type NewAgentSession } from "@antumbra/persistence";
import type { Runner } from "@antumbra/plugin-api";
import { ResourceReconciler } from "@antumbra/resource-reclamation";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option, Ref } from "effect";
import { passiveRunner } from "#test/harness.ts";

interface ResourceSeed {
	readonly agentId: string;
	readonly agentStatus: string;
	readonly moorageStatus: string;
	readonly sessionStatus?: string;
}

const seedResource = (seed: ResourceSeed) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const berthId = `${seed.agentId}:berth-0`;
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
				parentSessionId: null,
				rootSessionId: `${seed.agentId}:session`,
				status: seed.sessionStatus,
			} satisfies NewAgentSession);
		}
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

it.effectApp.withProviders(
	"automatic selection is only retired Agents and failed setup",
	Effect.gen(function* () {
		const reclaimed = yield* Ref.make<ReadonlyArray<string>>([]);
		const runner: Runner = {
			...passiveRunner,
			reclaim: (site) => Ref.update(reclaimed, (all) => [...all, site.path]).pipe(Effect.as({ _tag: "reclaimed" as const })),
		};
		return { providers: { runners: new Map([[runner.tag, runner]]) }, state: reclaimed };
	}),
	function* (_, reclaimed) {
		const reconciler = yield* ResourceReconciler;
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
		yield* reconciler.reconcile();
		expect(yield* Ref.get(reclaimed)).toEqual(["/tmp/moorage/agent-retired/berth-0", "/tmp/moorage/agent-failed-setup/berth-0"]);
		const siesta = yield* storedResource("agent-siesta");
		expect(siesta.berth.status).toBe("ready");
		expect(siesta.berth.reclaimState).toBeNull();
	},
);
