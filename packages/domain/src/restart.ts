import { Database } from "@antumbra/persistence";
import { rootSessions } from "@antumbra/sessions";
import { Effect, Option, Schema } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { KernelReach } from "#kernel-reach.ts";

const RESTART_RESUME = { key: "restart:resume" };

const decodeSessionIds = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Array(Schema.String)));

export const recordRestartIntent = Effect.gen(function* () {
	const db = yield* Database;
	const domain = yield* AgentDomain;
	const attached = yield* domain.sessionsAttached;
	const roots = yield* db.AgentSession.where(rootSessions).all();
	const resuming = roots.filter((session) => attached.has(session.id)).map((session) => session.id);
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
		const session = yield* db.AgentSession.where({ id: sessionId }).first();
		if (Option.isSome(session)) {
			yield* reach.submitWake({ sessionId });
		}
	}
});
