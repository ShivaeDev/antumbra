import { Database } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import { Effect } from "effect";
import { openSessions, rootSessions } from "#roots.ts";

export const RESTART_RESUME = { key: "restart:resume" };

export const record = Effect.fn("SessionRestart.record")(function* () {
	const db = yield* Database;
	const fabric = yield* SessionFabric;
	const attached = yield* fabric.attached();
	const roots = yield* db.AgentSession.where(rootSessions).where(openSessions).all();
	const resuming = roots.filter((session) => attached.has(session.id) && session.executionStatus !== "idle").map((session) => session.id);
	yield* db.AppMeta.where(RESTART_RESUME).deleteAll();
	yield* db.AppMeta.create({ ...RESTART_RESUME, value: JSON.stringify(resuming) });
});
