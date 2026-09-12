import { ToolCatalog } from "@antumbra/domain-agents/ports/tool-catalog.ts";
import { birthBySession } from "@antumbra/domain-agents/queries/birth-by-session.ts";
import { answerTool } from "@antumbra/domain-sessions/commands/answer-tool.ts";
import { callTool } from "@antumbra/domain-sessions/commands/call-tool.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { reading } from "@antumbra/domain-sessions/queries/reading.ts";
import { toolCall } from "@antumbra/domain-sessions/queries/tool-call.ts";
import type { ToolCall } from "@antumbra/platform-runner/tools.ts";
import type { ToolContext } from "@antumbra/platform-tool-schemas/context.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Option, Stream } from "effect";
import { handlers } from "#tools/catalog.ts";

export const invoke = Effect.fn("Tools.invoke")(function* (call: ToolCall) {
	const live = yield* Live;
	const commit = yield* Commit;
	const catalog = yield* ToolCatalog;
	const sessionId = SessionId.make(call.sessionId);
	const earlier = Option.getOrNull(yield* Stream.runHead(live.live(toolCall, { sessionId, callId: call.callId })));
	if (earlier?.answer != null) return earlier.answer;
	const bound = Option.getOrNull(yield* Stream.runHead(live.live(birthBySession, { sessionId })));
	const open = Option.getOrNull(yield* Stream.runHead(live.live(reading, { id: sessionId })));
	if (bound === null || open === null) return { ok: false, text: "this session has no bound tool set" };
	const tools = yield* catalog.byVersion(open.toolSetVersion);
	const context: ToolContext = {
		agentId: bound.agentId,
		sessionId: call.sessionId,
		callId: call.callId,
		...(bound.pieceId === null ? {} : { pieceId: bound.pieceId }),
		...(bound.voyageId === null ? {} : { voyageId: bound.voyageId }),
	};
	const input = JSON.stringify(call.input ?? {});
	const recorded = { sessionId, callId: call.callId, name: call.name, input };
	yield* commit
		.commit(callTool, { ...recorded, requestId: requestId(context, "tool-called") })
		.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
	const handler = handlers.get(call.name);
	const answer =
		tools.some((tool) => tool.name === call.name) && handler !== undefined
			? yield* handler.invoke(context, call.input)
			: { ok: false, text: `no tool named ${call.name} is bound to this session` };
	yield* commit
		.commit(answerTool, { ...recorded, answer, requestId: requestId(context, "tool-answered") })
		.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
	const saved = Option.getOrNull(yield* Stream.runHead(live.live(toolCall, { sessionId, callId: call.callId })));
	return saved?.answer ?? answer;
});
