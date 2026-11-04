import { clear as sourceClear } from "@antumbra/domain-lifecycle/commands/clear.ts";
import { record as sourceRecord } from "@antumbra/domain-lifecycle/commands/record.ts";
import { pending as sourcePending } from "@antumbra/domain-lifecycle/queries/pending.ts";
import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, query } from "@shivaedev/contract/operation.ts";
import { Effect, Schema } from "effect";
export const Record = command("record", {
	payload: sourceRecord.Input,
	success: Schema.Number,
	rejections: { ...sourceRecord.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Clear = command("clear", {
	payload: sourceClear.Input,
	success: Schema.Number,
	rejections: { ...sourceClear.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Pending = query("pending", {
	payload: sourcePending.input,
	success: sourcePending.output,
	reads: () => [collection("restart", Schema.String).list, collection("flag", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const LifecycleContract = contract("lifecycle", { commands: [Record, Clear], queries: [Pending] });
