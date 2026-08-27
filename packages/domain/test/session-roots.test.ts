import { SightSource } from "@antumbra/contract";
import { Database, type NewAgentSession } from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import { SessionFabricLive } from "@antumbra/session-fabric";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Result } from "effect";
import { makeCurrentSessionResumable } from "#current-session-resumable.ts";
import {
	makeRefuseSubsessionAttach,
	SubsessionAttachRefused,
} from "#session-attach-roots.ts";
import { SightSourceLive } from "#sight.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
	type ScriptedBackend,
} from "#test/harness.ts";
import { eventually } from "#test/session-recovery-fixture.ts";

const sightLayer = (
	temporary: TemporaryPersistence,
	scripted: ScriptedBackend,
) =>
	SightSourceLive.pipe(
		Layer.provideMerge(domainKernelLayer(temporary, scripted.backend)),
		Layer.provideMerge(SessionFabricLive),
	);

const spawnRequest = {
	backend: "scripted",
	charter: "chart the reef",
	role: "navigator",
};

// why: the creator of subsession rows arrives with acquisition. Until then a
// test writes the row the way the tree will, so the readers can be held to the
// discipline before anything downstream depends on it.
const openSubsession = (
	id: string,
	agentId: string,
	parentSessionId: string,
	rootSessionId: string,
) =>
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
			yield* eventually(
				Effect.gen(function* () {
					const fleet = yield* sight.fleet;
					expect(
						fleet.agents
							.flatMap((agent) => agent.sessions)
							.map((row) => row.id),
					).toEqual([receipt.sessionId]);
				}),
			);

			yield* openSubsession(
				"session-child",
				receipt.agentId,
				receipt.sessionId,
				receipt.sessionId,
			);
			const fleet = yield* sight.fleet;
			expect(
				fleet.agents.flatMap((agent) => agent.sessions).map((row) => row.id),
			).toEqual([receipt.sessionId]);
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
			yield* eventually(
				Effect.gen(function* () {
					const fleet = yield* sight.fleet;
					expect(fleet.agents).not.toEqual([]);
				}),
			);
			yield* openSubsession(
				"session-child",
				receipt.agentId,
				receipt.sessionId,
				receipt.sessionId,
			);

			const resumable = yield* makeCurrentSessionResumable;
			expect(
				Result.isSuccess((yield* resumable(receipt.sessionId)).session),
			).toBe(true);
			const child = (yield* resumable("session-child")).session;
			expect(Result.isFailure(child)).toBe(true);
			if (Result.isFailure(child)) {
				expect(child.failure._tag).toBe("no-root");
			}
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

// why: selection keeps a child out of the paths only roots may take; this is
// the seam underneath it, where an id becomes a live attachment. A caller that
// came by a child id any other way is refused here, in the type rather than in
// a comment.
it.live("the attachment seam refuses a subsession id outright", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			yield* eventually(
				Effect.gen(function* () {
					const fleet = yield* sight.fleet;
					expect(fleet.agents).not.toEqual([]);
				}),
			);
			yield* openSubsession(
				"session-child",
				receipt.agentId,
				receipt.sessionId,
				receipt.sessionId,
			);

			const refuseSubsession = yield* makeRefuseSubsessionAttach;
			yield* refuseSubsession(receipt.sessionId);
			const refused = yield* Effect.flip(refuseSubsession("session-child"));
			expect(refused).toBeInstanceOf(SubsessionAttachRefused);
			expect(refused.message).toContain(receipt.sessionId);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);
