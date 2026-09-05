import { Database } from "@antumbra/persistence";
import { rootSessionsOf } from "@antumbra/sessions";
import { rawOf } from "@antumbra/testing-runtime";
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

export const completesTurn = (session: ScriptedSession) =>
	session.emit({
		durationMs: 1,
		raw: rawOf("turn/completed"),
		status: "completed",
		type: "turn.completed",
	});

const restedRoots = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const roots = yield* db.AgentSession.where(rootSessionsOf(agentId)).all();
		if (roots.length === 0 || !roots.every((row) => row.executionStatus === "idle")) {
			return yield* Effect.fail("the session is still working");
		}
	}).pipe(Effect.retry(Schedule.spaced(10).pipe(Schedule.upTo({ duration: 2000 }))));

export const endTurn = (scripted: ScriptedBackend, agentId: string) =>
	Effect.gen(function* () {
		yield* completesTurn(yield* sessionFor(scripted, agentId));
		yield* restedRoots(agentId);
	});
