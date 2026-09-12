import { type App, answered, it } from "@antumbra/app-testing/entry.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { agentBoard } from "@antumbra/domain-boards/ids.ts";
import { observed } from "@antumbra/domain-sessions/facts/observed.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { invoke } from "#tools/invoke.ts";

const start = Effect.fn(function* (app: App, name: string) {
	const requested = Request.make(`birth:${name}`);
	const { agentId, sessionId } = identity(requested);
	yield* app.api.agents.spawn({ requestId: requested, role: "hand", backend: "claude", model: null, effort: null });
	const commit = yield* Commit;
	yield* commit.observe(observed, {
		logId: `log:${name}`,
		cursor: 0,
		at: 100,
		requestId: Request.make(`started:${name}`),
		payload: {
			live: true,
			sessionId,
			nodeRef: null,
			origin: null,
			operationId: `birth:${name}`,
			evidence: { type: "started", agentId, backend: "scripted", cwd: "/berth", nativeRef: name, runnerId: "runner", toolSetVersion: "crew-v1" },
		},
	});
	return { agentId, sessionId };
});

it.app("records tool answers under the bound session and replays them without repeating the write", function* (app) {
	const first = yield* start(app, "first");
	const second = yield* start(app, "second");
	const call = { sessionId: first.sessionId, callId: "call", name: "write_board", input: { scope: "self", body: "First sounding" } };
	const answer = yield* invoke(call);
	expect(answer).toEqual({ ok: true, text: "written to the self board" });
	expect(yield* invoke(call)).toEqual(answer);
	yield* invoke({ ...call, sessionId: second.sessionId, input: { scope: "self", body: "Second sounding" } });
	for (const [bound, body] of [
		[first, "First sounding"],
		[second, "Second sounding"],
	] as const) {
		const notes = yield* answered(app.api.boards.digest({ board: agentBoard(bound.agentId) }));
		expect(notes).toHaveLength(1);
		expect(notes[0]).toMatchObject({ authorAgentId: bound.agentId, body });
		expect(yield* answered(app.api.sessions.reading({ id: bound.sessionId }))).toMatchObject({ toolCalls: 1 });
	}
	const read = { sessionId: first.sessionId, callId: "read", name: "read_board", input: { scope: "self" } };
	const reading = yield* invoke(read);
	yield* invoke({ ...call, callId: "next-note", input: { scope: "self", body: "Later sounding" } });
	expect(yield* invoke(read)).toEqual(reading);
	expect((yield* invoke({ ...read, callId: "fresh-read" })).text).toContain("Later sounding");
});

it.app("serves only the tools frozen for the session", function* (app) {
	const { sessionId } = yield* start(app, "crew");
	const call = { sessionId, callId: "fleet", name: "register_repo", input: { source: "https://github.com/fleet/chart.git", defaultRef: "main" } };
	const answer = yield* invoke(call);
	expect(answer).toEqual({ ok: false, text: "no tool named register_repo is bound to this session" });
	expect(yield* invoke(call)).toEqual(answer);
	expect(yield* answered(app.api.repos.all({}))).toEqual([]);
});
