import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Clock, Effect } from "effect";
import { expect } from "vitest";
import { identity } from "#ids.ts";

const REQUEST = Id.Request.make("resting");
const { agentId, sessionId } = identity(REQUEST);
const raw = { source: "scripted", kind: "turn.completed", payload: "{}" };
const source = { logId: "runner", at: 0 };
const registration = { runnerId: "runner", logId: "runner", backends: [], imageInputBackends: [] };

const opened = [
	{
		...source,
		cursor: 0,
		event: {
			type: "SessionStarted" as const,
			requestId: REQUEST,
			sessionId,
			agentId,
			backend: "claude",
			cwd: "/berth",
			nativeRef: "native",
			runnerId: "runner",
			toolSetVersion: "crew-v1",
		},
	},
	{ ...source, cursor: 1, event: { type: "InputAccepted" as const, requestId: REQUEST, sessionId, inputId: "charter" } },
];
const completed = {
	...source,
	cursor: 3,
	event: {
		type: "ProviderEvent" as const,
		sessionId,
		observation: "live" as const,
		event: { type: "turn.completed" as const, status: "completed" as const, raw },
	},
};
const spawning = { requestId: REQUEST, role: "hand", backend: "claude" as const, model: null, effort: null };

it.app("reports the moment an idle agent's siesta comes due and follows the threshold setting", function* (app) {
	const runner = yield* connectRunner(registration);
	yield* app.api.agents.spawn(spawning);
	yield* runner.append(opened);
	yield* app.api.settings.setCount({ key: "idleSiestaMinutes", count: 1 });
	expect((yield* answered(app.api.agents.rest({}), "the rest report to be read")).siestas).toEqual([]);

	yield* runner.append([completed]);
	yield* eventually(app.api.agents.reading({ id: agentId }), (held) => held?.canSleep === true, "the agent's reading to allow sleep");
	expect((yield* answered(app.api.agents.rest({}), "the rest report to be read")).siestas).toMatchObject([{ sessionId, waitUntil: 60_000 }]);

	yield* app.api.settings.setCount({ key: "idleSiestaMinutes", count: 5 });
	expect((yield* answered(app.api.agents.rest({}), "the rest report to be read")).siestas).toMatchObject([{ sessionId, waitUntil: 300_000 }]);
});

it.app("asks an idle agent to sleep when its siesta comes due with no row moving", function* (app) {
	const runner = yield* connectRunner(registration);
	yield* app.api.agents.spawn(spawning);
	yield* runner.append([...opened, completed]);
	yield* app.api.settings.setCount({ key: "idleSiestaMinutes", count: 1 });
	const resting = yield* eventually(app.api.agents.rest({}), (reading) => reading.siestas.length === 1, "one siesta to appear in the rest report");
	const siesta = resting.siestas[0];
	if (siesta === undefined) return yield* Effect.die("Missing siesta candidate");

	yield* app.clock.advance(siesta.waitUntil - (yield* Clock.currentTimeMillis) - 1);
	expect(yield* answered(app.api.sessions.operations({ sessionId }), "the session's operations to be listed")).toEqual([]);

	yield* app.clock.advance(1);
	const asked = yield* eventually(app.api.sessions.operations({ sessionId }), (rows) => rows.length === 1, "one session operation to appear");
	expect(asked).toMatchObject([{ kind: "sleep", status: "requested" }]);
});

it.app("asks for a siesta refused while the agent worked once the work ends", function* (app) {
	const runner = yield* connectRunner(registration);
	yield* app.api.agents.spawn(spawning);
	yield* runner.append([
		...opened,
		{ ...source, cursor: 2, event: { type: "ToolCalled" as const, sessionId, callId: "call", name: "shell", input: "pwd" } },
		completed,
	]);
	yield* app.api.settings.setCount({ key: "idleSiestaMinutes", count: 1 });
	yield* eventually(
		app.api.agents.reading({ id: agentId }),
		(held) => held !== null && held.idleSince !== null && !held.canSleep,
		"the agent to go idle without becoming sleepable",
	);

	yield* app.clock.advance(2 * 60_000);
	expect(yield* answered(app.api.sessions.operations({ sessionId }), "the session's operations to be listed")).toEqual([]);

	yield* runner.append([
		{ ...source, cursor: 4, event: { type: "ToolAnswered" as const, sessionId, callId: "call", answer: { ok: true, text: "/berth" } } },
	]);
	const asked = yield* eventually(app.api.sessions.operations({ sessionId }), (rows) => rows.length === 1, "one session operation to appear");
	expect(asked).toMatchObject([{ kind: "sleep", status: "requested" }]);
});
