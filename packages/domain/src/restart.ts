import { Database } from "@antumbra/persistence";
import { openSessions, rootSessions } from "@antumbra/sessions";
import { Effect, Option, Schema } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { KernelReach } from "#kernel-reach/service.ts";

const RESTART_RESUME = { key: "restart:resume" };

const decodeSessionIds = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Array(Schema.String)));

export const recordRestartIntent = Effect.gen(function* () {
	const db = yield* Database;
	const domain = yield* AgentDomain;
	const attached = yield* domain.sessionsAttached;
	const roots = yield* db.AgentSession.where(rootSessions).where(openSessions).all();
	const resuming = roots.filter((session) => attached.has(session.id) && session.executionStatus !== "idle").map((session) => session.id);
	yield* db.AppMeta.where(RESTART_RESUME).deleteAll();
	yield* db.AppMeta.create({ ...RESTART_RESUME, value: JSON.stringify(resuming) });
});

export const abandonRestartIntent = Effect.gen(function* () {
	const db = yield* Database;
	yield* db.AppMeta.where(RESTART_RESUME).deleteAll();
});

export const honorRestartIntent = Effect.gen(function* () {
	const db = yield* Database;
	const reach = yield* KernelReach;
	const intent = yield* db.AppMeta.where(RESTART_RESUME).first();
	if (Option.isNone(intent)) {
		return;
	}
	yield* db.AppMeta.where(RESTART_RESUME).deleteAll();
	for (const sessionId of yield* decodeSessionIds(intent.value.value)) {
		yield* reach.submitWake({ sessionId });
	}
});
