import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { entry, started } from "@antumbra/app-testing/test-support/execution-data.ts";
import { identity } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { expect } from "vitest";

const birth = Request.make("input-worker");
const { agentId, sessionId } = identity(birth);
postgresApp.it(
	"a new input clears the stopped Agent reading only when its transaction commits",
	[],
	function* ({ journal, replayJournal, api, holdWrite, clearPublished, published, rebuild }) {
		const legacy = yield* journal();
		yield* legacy.api.agents.spawn({ requestId: birth, role: "hand", backend: "claude", model: null, effort: null });
		const log = "input-worker-log";
		const runner = yield* legacy.runner({ runnerId: "runner", logId: log, backends: [], imageInputBackends: [] });
		yield* runner.append([
			started(log, 0, sessionId, agentId),
			entry(log, 1, { type: "InputAccepted", sessionId, requestId: `start:${sessionId}`, inputId: "charter" }),
		]);
		yield* replayJournal(legacy);
		yield* api["sessions.stop"]({ requestId: Request.make("stop"), sessionId, reason: "hold", requestedAt: new Date(0).toISOString() });
		expect(yield* api["agents.reading"]({ id: agentId })).toMatchObject({ state: "stopped" });
		yield* clearPublished();
		const held = yield* holdWrite(
			api["inputs.submit"]({
				id: SessionInputId.make("00000000-0000-4000-8000-000000000071"),
				sessionId,
				parts: [{ type: "text", text: "Continue the survey" }],
			}),
		);
		expect(yield* api["agents.reading"]({ id: agentId })).toMatchObject({ state: "stopped" });
		expect(yield* published()).toEqual([]);
		yield* held.commit();
		expect(yield* api["agents.reading"]({ id: agentId })).toMatchObject({ state: "working" });
		expect(yield* published()).toEqual(expect.arrayContaining(["session", `session:${agentId}`, "agentReading"]));
		yield* rebuild();
		expect(yield* api["agents.reading"]({ id: agentId })).toMatchObject({ state: "working" });
	},
);
