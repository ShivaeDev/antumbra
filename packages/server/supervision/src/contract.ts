import { failLoop as sourceFailLoop } from "@antumbra/domain-supervision/commands/loop-failed.ts";
import { forgetLoop as sourceForgetLoop } from "@antumbra/domain-supervision/commands/loop-forgotten.ts";
import { resumeLoop as sourceResumeLoop } from "@antumbra/domain-supervision/commands/loop-resumed.ts";
import { stoppedLoops as sourceStoppedLoops } from "@antumbra/domain-supervision/queries/stopped-loops.ts";
import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, query } from "@shivaedev/contract/operation.ts";
import { Effect, Schema } from "effect";
export const FailLoop = command("failLoop", {
	payload: sourceFailLoop.Input,
	success: Schema.Number,
	rejections: { ...sourceFailLoop.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const ForgetLoop = command("forgetLoop", {
	payload: sourceForgetLoop.Input,
	success: Schema.Number,
	rejections: { ...sourceForgetLoop.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const ResumeLoop = command("resumeLoop", {
	payload: sourceResumeLoop.Input,
	success: Schema.Number,
	rejections: { ...sourceResumeLoop.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const StoppedLoops = query("stoppedLoops", {
	payload: sourceStoppedLoops.input,
	success: sourceStoppedLoops.output,
	reads: () => [collection("stoppedLoop", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const SupervisionContract = contract("supervision", { commands: [FailLoop, ForgetLoop, ResumeLoop], queries: [StoppedLoops] });
