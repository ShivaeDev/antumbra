import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { Effect, Layer } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";

const resumableSessionIds = Effect.gen(function* () {
	const db = yield* Database;
	const alive = yield* db.Agent.where({ status: "alive" }).all();
	const aliveIds = new Set(alive.map((agent) => agent.id));
	const open = yield* db.AgentSession.where({ status: "open" }).all();
	return open
		.filter((session) => aliveIds.has(session.agentId))
		.map((session) => session.id);
});

export const AgentRecoveryLive = Layer.effectDiscard(
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const kernel = yield* Kernel;
		const active = yield* kernel.active(domain.recover);
		const alreadyQueued = new Set(
			active.map((intent) => intent.payload.sessionId),
		);
		const sessions = yield* resumableSessionIds;
		yield* Effect.forEach(
			sessions.filter((sessionId) => !alreadyQueued.has(sessionId)),
			(sessionId) => kernel.submit(domain.recover, { sessionId }),
			{ concurrency: 1 },
		);
	}),
);
