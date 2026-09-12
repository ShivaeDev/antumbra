import { Token } from "@antumbra/platform-rpc/token.ts";
import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";
import { LogEntry, Registration } from "#log.ts";
import { Operation, Reply } from "#operations.ts";
import { ToolAnswer, ToolCall } from "#tools.ts";

export const RunnerRpc = RpcGroup.make(
	Rpc.make("runner.operations", { payload: Registration, success: Operation, stream: true }),
	Rpc.make("runner.reply", { payload: Reply, success: Schema.Void }),
	Rpc.make("runner.append", { payload: Schema.Struct({ logId: Schema.String, entries: Schema.Array(LogEntry) }), success: Schema.Int }),
	Rpc.make("runner.cursor", { payload: Schema.Struct({ logId: Schema.String }), success: Schema.Int }),
	Rpc.make("runner.tool", { payload: ToolCall, success: ToolAnswer }),
).middleware(Token);
