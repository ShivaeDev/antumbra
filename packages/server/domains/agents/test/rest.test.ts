import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";
import { identity } from "#ids.ts";

const REQUEST = Id.Request.make("resting");
const { agentId, sessionId } = identity(REQUEST);
const raw = { source: "scripted", kind: "turn.completed", payload: "{}" };

it.app("reports the moment an idle agent's siesta comes due and follows the threshold setting", function* (app) {
	const runner = yield* connectRunner({ runnerId: "runner", logId: "runner", backends: [], imageInputBackends: [] });
	yield* app.api.agents.spawn({ requestId: REQUEST, role: "hand", backend: "claude", model: null, effort: null });
	const source = { logId: "runner", at: 0 };
	yield* runner.append([
		{
			...source,
			cursor: 0,
			event: {
				type: "SessionStarted",
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
		{ ...source, cursor: 1, event: { type: "InputAccepted", requestId: REQUEST, sessionId, inputId: "charter" } },
	]);
	yield* app.api.settings.setCount({ key: "idleSiestaMinutes", count: 1 });
	expect((yield* answered(app.api.agents.rest({}))).siestas).toEqual([]);

	yield* runner.append([
		{
			...source,
			cursor: 2,
			event: { type: "ProviderEvent", sessionId, observation: "live", event: { type: "turn.completed", status: "completed", raw } },
		},
	]);
	yield* eventually(app.api.agents.reading({ id: agentId }), (held) => held?.canSleep === true);
	expect((yield* answered(app.api.agents.rest({}))).siestas).toMatchObject([{ sessionId, waitUntil: 60_000 }]);

	yield* app.api.settings.setCount({ key: "idleSiestaMinutes", count: 5 });
	expect((yield* answered(app.api.agents.rest({}))).siestas).toMatchObject([{ sessionId, waitUntil: 300_000 }]);
});
