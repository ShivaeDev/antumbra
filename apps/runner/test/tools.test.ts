import { answered, it } from "@antumbra/app-testing/entry.ts";
import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
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
	const sessionId = SessionId.make("first-session");
	const agentId = AgentId.make("first-agent");
	const requestId = Request.make("first-start");
	const logId = "first-log";
	yield* app.api.starts.request({
		requestId,
		agentId,
		sessionId,
		source: "direct",
		voyageId: null,
		pieceId: null,
		backend: "claude",
		model: null,
		effort: null,
		role: "hand",
		charter: "Record the sounding",
		toolSetVersion: "crew-v1",
		tools: [{ name: "write_board", description: "Write a board", inputSchema: {} }],
	});
	const calls = yield* RpcTest.makeClient(RunnerRpc);
	expect(yield* calls["runner.cursor"]({ logId })).toBe(-1);
	const local = Layer.merge(file({ filename: ":memory:", logId }), Layer.succeed(RunnerClient, { calls, connected: Effect.void }));
	yield* Effect.gen(function* () {
		const log = yield* RunnerLog;
		const tools = yield* ServerTools;
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
		expect(yield* calls["runner.cursor"]({ logId })).toBe(1);
		expect(yield* answered(app.api.sessions.reading({ id: sessionId }))).toMatchObject({ toolCalls: 1 });
	}).pipe(Effect.provide(serverTools(logId).pipe(Layer.provideMerge(local))));
});
