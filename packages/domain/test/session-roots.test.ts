import { SightSource } from "@antumbra/contract";
import { Database, type NewAgentSession } from "@antumbra/persistence";
import { makeRefuseSubsessionAttach, SubsessionAttachRefused } from "@antumbra/sessions";
import { CurrentSessions } from "@antumbra/sessions/current/service";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Result, Stream } from "effect";

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

it.effectApp("the fleet lists root Sessions and never a subsession", function* () {
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
});

it.effectApp("a subsession is never a resume target", function* () {
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

	const current = yield* CurrentSessions;
	expect(Result.isSuccess(yield* current.resumable(receipt.sessionId))).toBe(true);
	const child = yield* current.resumable("session-child");
	expect(Result.isFailure(child)).toBe(true);
	if (Result.isFailure(child)) {
		expect(child.failure._tag).toBe("no-root");
	}
});

it.effectApp("the attachment seam refuses a subsession id outright", function* () {
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
});
