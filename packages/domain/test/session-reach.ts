import { Database } from "@antumbra/persistence";
import { rootSessionsOf } from "@antumbra/sessions";
import { Effect, Option, Schedule } from "effect";
import type { ScriptedBackend, ScriptedSession } from "#test/harness.ts";

export const sessionFor = (scripted: ScriptedBackend, agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = (yield* db.AgentSession.where({ agentId }).all())[0];
		if (row === undefined) {
			return yield* Effect.fail("no session yet");
		}
		const live = yield* scripted.session(row.id);
		return live === undefined ? yield* Effect.fail("the session is not scripted") : live;
	});

export const callTool = (session: ScriptedSession, name: string, args: unknown) =>
	Option.match(Option.fromUndefinedOr(session.tools.find((tool) => tool.name === name)), {
		onNone: () => Effect.die(`the session has no ${name} tool`),
		onSome: (tool) => tool.call(args),
	});

export const standDown = (scripted: ScriptedBackend, agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const live = yield* sessionFor(scripted, agentId);
		const settled = yield* callTool(live, "stand_down", undefined);
		const roots = db.AgentSession.where(rootSessionsOf(agentId)).all();
		yield* Effect.retry(
			Effect.flatMap(roots, (rows) =>
				rows.every((row) => row.executionStatus === "idle") ? Effect.void : Effect.fail("the session is still working"),
			),
			Schedule.spaced(10).pipe(Schedule.upTo({ duration: 2000 })),
		);
		return settled;
	});
