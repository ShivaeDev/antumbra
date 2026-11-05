import { Runner } from "@antumbra/platform-access/policy.ts";
import { ToolAnswer } from "@antumbra/platform-vocabulary/tool-answer.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, stream } from "@shivaedev/contract/operation.ts";
import { Schema } from "effect";
import { LogEntry, Registration } from "#log.ts";
import { Operation, Reply } from "#operations.ts";
import { ToolCall } from "#tools.ts";

export const RunnerContract = contract("runner", {
	streams: [stream("operations", { payload: Registration, success: Operation, reads: () => [] })],
	commands: [
		command("reply", { payload: Reply, success: Schema.Void, invalidates: () => [] }),
		command("append", { payload: { logId: Schema.String, entries: Schema.Array(LogEntry) }, success: Schema.Int, invalidates: () => [] }),
		command("cursor", { payload: { logId: Schema.String }, success: Schema.Int, invalidates: () => [] }),
		command("tool", { payload: ToolCall, success: ToolAnswer, invalidates: () => [] }),
	],
}).middleware(Runner);

export const RunnerRpc = RunnerContract.application;
