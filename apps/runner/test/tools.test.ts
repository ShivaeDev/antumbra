import { answered, it } from "@antumbra/app-testing/entry.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { RunnerRpc } from "@antumbra/platform-runner/rpc.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { RunnerLog } from "@antumbra/runner-fabric/log.ts";
import { ServerTools } from "@antumbra/runner-fabric/ports.ts";
import { Effect, Layer } from "effect";
import * as RpcTest from "effect/unstable/rpc/RpcTest";
import { expect } from "vitest";
import { file } from "#adapters/log.ts";
import { RunnerClient } from "#connection.ts";
import { serverTools } from "#tools.ts";

it.app("acknowledges the first session and tool log before invoking its bound tool", function* (app) {
	const requestId = Request.make("first-agent");
	const { agentId, sessionId } = identity(requestId);
	yield* app.api.agents.spawn({ requestId, role: "hand", backend: "claude", model: null, effort: null });
	const calls = yield* RpcTest.makeClient(RunnerRpc);
	const local = Layer.merge(file({ filename: ":memory:", seed: "first-log" }), Layer.succeed(RunnerClient, { calls, connected: Effect.void }));
	yield* Effect.gen(function* () {
		const log = yield* RunnerLog;
		const tools = yield* ServerTools;
		expect(yield* calls["runner.cursor"]({ logId: log.logId })).toBe(-1);
		yield* log.append({
			type: "SessionStarted",
			requestId,
			sessionId,
			agentId,
			backend: "claude",
			cwd: "/berth",
			nativeRef: "native",
			runnerId: "runner",
			toolSetVersion: "crew-v1",
		});
		const call = { sessionId, callId: "first-tool", name: "write_board", input: { scope: "self", body: "First sounding" } };
		yield* log.append({ type: "ToolCalled", sessionId, callId: call.callId, name: call.name, input: JSON.stringify(call.input) });
		expect(yield* tools.call(call)).toEqual({ ok: true, text: "written to the self board" });
		expect(yield* calls["runner.cursor"]({ logId: log.logId })).toBe(1);
		expect(yield* answered(app.api.sessions.reading({ id: sessionId }))).toMatchObject({ toolCalls: 1 });
	}).pipe(Effect.provide(serverTools.pipe(Layer.provideMerge(local))));
});
