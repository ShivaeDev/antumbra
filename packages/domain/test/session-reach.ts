import { Database } from "@antumbra/persistence";
import { rootSessionsOf } from "@antumbra/sessions";
import { Effect, Option, Schedule } from "effect";
import type { ScriptedBackend, ScriptedSession } from "#test/harness.ts";

// why: how a rehearsal gets hold of a running Agent and makes it do
// something — separate from the scripting that stands one up and from the
// layers that wire the domain, because reaching an Agent is what a test
// does over and over once both of those are done.

// why: a test reaches an agent the way the app does — through the session row
// the spawn wrote — so nothing has to be threaded out of the intent.
export const sessionFor = (scripted: ScriptedBackend, agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = (yield* db.AgentSession.where({ agentId }).all())[0];
		if (row === undefined) {
			return yield* Effect.fail("no session yet");
		}
		const live = yield* scripted.session(row.id);
		return live === undefined
			? yield* Effect.fail("the session is not scripted")
			: live;
	});

export const callTool = (
	session: ScriptedSession,
	name: string,
	args: unknown,
) =>
	Option.match(
		Option.fromUndefinedOr(session.tools.find((tool) => tool.name === name)),
		{
			onNone: () => Effect.die(`the session has no ${name} tool`),
			onSome: (tool) => tool.call(args),
		},
	);

// why: the farewell a crew says for itself, said by hand. Retirement is offered
// on a session that has declared it has nothing left to do and refused on one
// mid-turn, so a rehearsal reaches it by the one door the app has. The request
// is accepted before the record catches up and rest is read off the record, so
// this waits for the row rather than for the tool's answer.
export const standDown = (scripted: ScriptedBackend, agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const live = yield* sessionFor(scripted, agentId);
		const settled = yield* callTool(live, "stand_down", undefined);
		const roots = db.AgentSession.where(rootSessionsOf(agentId)).all();
		yield* Effect.retry(
			Effect.flatMap(roots, (rows) =>
				rows.every((row) => row.executionStatus === "idle")
					? Effect.void
					: Effect.fail("the session is still working"),
			),
			Schedule.spaced(10).pipe(Schedule.upTo({ duration: 2000 })),
		);
		return settled;
	});
