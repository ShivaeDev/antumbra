import { answered, it } from "@antumbra/app-testing/entry.ts";
import { inputApi } from "@antumbra/app-testing/inputs.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { RunnerRpc } from "@antumbra/platform-runner/rpc.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Effect } from "effect";
import * as RpcTest from "effect/unstable/rpc/RpcTest";
import { expect } from "vitest";

it.app("an offline hail wakes the existing native conversation after cold runner catchup", function* ({ api, clock }) {
	const birth = Request.make("offline-agent");
	const { agentId, sessionId } = identity(birth);
	const registration = { runnerId: "runner", logId: "log", backends: ["claude"], imageInputBackends: [] };
	yield* Effect.scoped(
		Effect.gen(function* () {
			const runner = yield* connectRunner(registration);
			yield* api.agents.spawn({ requestId: birth, role: "crew", backend: "claude", model: null, effort: null });
			const plan = yield* runner.next;
			expect(plan.type).toBe("Plan");
			yield* runner.reply(plan.requestId, { type: "MooragePlanned", plan: { root: "/berth", berths: [] } });
			const provision = yield* runner.next;
			expect(provision.type).toBe("Provision");
			yield* runner.reply(provision.requestId, { type: "Accepted" });
			const start = yield* runner.next;
			expect(start.type).toBe("Start");
			yield* runner.append([
				{
					logId: "log",
					cursor: 0,
					at: 0,
					event: {
						type: "SessionStarted",
						requestId: start.requestId,
						sessionId,
						agentId,
						backend: "claude",
						cwd: "/berth",
						nativeRef: "native",
						runnerId: "runner",
						toolSetVersion: "tools",
					},
				},
				{ logId: "log", cursor: 1, at: 0, event: { type: "InputAccepted", requestId: start.requestId, sessionId, inputId: "birth:charter" } },
			]);
			yield* runner.reply(start.requestId, { type: "Accepted" });
		}),
	);
	const inputs = yield* inputApi;
	const inputId = SessionInputId.make("00000000-0000-4000-8000-000000000094");
	expect(yield* inputs.submit({ id: inputId, sessionId, parts: [{ type: "text", text: "Continue the survey" }] })).toEqual({
		id: inputId,
		status: "queued_for_wake",
	});
	expect(yield* answered(api.sessions.reading({ id: sessionId }))).toMatchObject({ attached: true });
	yield* clock.advance(1);
	const calls = yield* RpcTest.makeClient(RunnerRpc, { flatten: true });
	yield* calls("runner.append", { logId: "log", entries: [{ logId: "log", cursor: 2, at: 1, event: { type: "SessionDetached", sessionId } }] });
	const runner = yield* connectRunner(registration);
	const wake = yield* runner.next;
	expect(wake).toMatchObject({ type: "Wake", sessionId, nativeRef: "native", options: { cwd: "/berth" }, instruction: { id: inputId } });
	yield* runner.append([{ logId: "log", cursor: 3, at: 2, event: { type: "InputAccepted", requestId: wake.requestId, sessionId, inputId } }]);
	yield* runner.reply(wake.requestId, { type: "Accepted" });
	expect(yield* answered(api.inputs.reading({ sessionId, id: inputId }))).toMatchObject({ status: "accepted" });
});
