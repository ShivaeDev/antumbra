import { Clock, Effect, Option } from "effect";
import type { RpcConnection, RpcServerRequest } from "#adapters/rpc.ts";
import { residualApproval } from "#approvals.ts";
import { dynamicToolAnswer } from "#tool-calls.ts";
import type { ToolRegistry } from "#tool-registry.ts";

const MILLIS_PER_SECOND = 1000;

// Codex currentTime/read uses whole Unix seconds.
const currentTime = Clock.currentTimeMillis.pipe(
	Effect.map((millis) => ({
		currentTimeAt: Math.floor(millis / MILLIS_PER_SECOND),
	})),
);

const answerFor = (tools: ToolRegistry, request: RpcServerRequest): Effect.Effect<Option.Option<unknown>> => {
	if (request.method === "currentTime/read") {
		return Effect.map(currentTime, Option.some);
	}
	if (request.method === "item/tool/call") {
		return Effect.map(dynamicToolAnswer(tools, request.params), Option.some);
	}
	return Effect.succeed(residualApproval(request));
};

// Every Codex server request receives a result or JSON-RPC error.
export const answerServerRequest = (rpc: RpcConnection, tools: ToolRegistry, request: RpcServerRequest): Effect.Effect<void> =>
	answerFor(tools, request).pipe(
		Effect.flatMap((answer) =>
			Effect.sync(() =>
				Option.match(answer, {
					onNone: () =>
						rpc.respondError(request.id, {
							code: -32601,
							message: `antumbra does not serve ${request.method}`,
						}),
					onSome: (result) => rpc.respond(request.id, result),
				}),
			),
		),
	);
