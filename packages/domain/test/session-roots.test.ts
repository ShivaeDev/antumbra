import { SightSource } from "@antumbra/contract";
import { Database, type NewAgentSession } from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import { SessionFabricLive } from "@antumbra/session-fabric";
import { makeCurrentSessionResumable, makeRefuseSubsessionAttach, SubsessionAttachRefused } from "@antumbra/sessions";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Result, Stream } from "effect";
import { domainKernelLayer, sightSourceTestLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, type ScriptedBackend } from "#test/harness.ts";

const sightLayer = (temporary: TemporaryPersistence, scripted: ScriptedBackend) =>
	sightSourceTestLayer.pipe(Layer.provideMerge(domainKernelLayer(temporary, scripted.backend)), Layer.provideMerge(SessionFabricLive));

const spawnRequest = {
	backend: "scripted",
	charter: "chart the reef",
	role: "navigator",
};

const openSubsession = (id: string, agentId: string, parentSessionId: string, rootSessionId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.AgentSession.create({
			agentId,
			backend: "scripted",
			charterDeliveredAt: null,
			completeness: "recording",
			cwd: `/tmp/moorage/${agentId}`,
			executionStatus: "active",
			id,
			kind: "task",
			label: "delegated reef survey",
			nativeRef: null,
			outcome: null,
			parentSessionId,
			rootSessionId,
			status: "open",
		} satisfies NewAgentSession);
	});

it.live("the fleet lists root Sessions and never a subsession", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			yield* sight.fleetFeed.pipe(
				Stream.filter((fleet) =>
					fleet.agents.some((agent) => agent.id === receipt.agentId && agent.sessions.some((session) => session.id === receipt.sessionId)),
				),
				Stream.runHead,
			);

			yield* openSubsession("session-child", receipt.agentId, receipt.sessionId, receipt.sessionId);
			const fleet = yield* sight.fleet;
			expect(fleet.agents.flatMap((agent) => agent.sessions).map((row) => row.id)).toEqual([receipt.sessionId]);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

it.live("a subsession is never a resume target", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			yield* sight.fleetFeed.pipe(
				Stream.filter((fleet) =>
					fleet.agents.some(
						(agent) => agent.id === receipt.agentId && agent.status === "alive" && agent.sessions.some((session) => session.id === receipt.sessionId),
					),
				),
				Stream.runHead,
			);
			yield* openSubsession("session-child", receipt.agentId, receipt.sessionId, receipt.sessionId);

			const resumable = yield* makeCurrentSessionResumable;
			expect(Result.isSuccess((yield* resumable(receipt.sessionId)).session)).toBe(true);
			const child = (yield* resumable("session-child")).session;
			expect(Result.isFailure(child)).toBe(true);
			if (Result.isFailure(child)) {
				expect(child.failure._tag).toBe("no-root");
			}
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

it.live("the attachment seam refuses a subsession id outright", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			yield* sight.fleetFeed.pipe(
				Stream.filter((fleet) =>
					fleet.agents.some((agent) => agent.id === receipt.agentId && agent.sessions.some((session) => session.id === receipt.sessionId)),
				),
				Stream.runHead,
			);
			yield* openSubsession("session-child", receipt.agentId, receipt.sessionId, receipt.sessionId);

			const refuseSubsession = yield* makeRefuseSubsessionAttach;
			yield* refuseSubsession(receipt.sessionId);
			const refused = yield* Effect.flip(refuseSubsession("session-child"));
			expect(refused).toBeInstanceOf(SubsessionAttachRefused);
			expect(refused.message).toContain(receipt.sessionId);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);
