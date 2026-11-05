import { Owner } from "@antumbra/platform-access/policy.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command } from "@shivaedev/contract/operation.ts";
import { Schema } from "effect";

export class LifecycleRefused extends Schema.TaggedError<LifecycleRefused>()("LifecycleRefused", { message: Schema.String }) {}

const request = { payload: { requestId: Schema.String }, success: Schema.Void, rejections: { LifecycleRefused }, invalidates: () => [] };
export const LifecycleRpc = contract("lifecycle", {
	commands: [command("drain", request), command("recordRestart", request), command("honorRestart", request), command("abandonRestart", request)],
}).application.middleware(Owner);
