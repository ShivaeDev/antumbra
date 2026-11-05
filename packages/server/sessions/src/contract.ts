import { charter as sourceCharter } from "@antumbra/domain-sessions/commands/charter.ts";
import { request as sourceRequest } from "@antumbra/domain-sessions/commands/request.ts";
import { retry as sourceRetry } from "@antumbra/domain-sessions/commands/retry.ts";
import { stop as sourceStop } from "@antumbra/domain-sessions/commands/stop.ts";
import { opening as sourceOpening } from "@antumbra/domain-sessions/queries/opening.ts";
import { operations as sourceOperations } from "@antumbra/domain-sessions/queries/operations.ts";
import { pending as sourcePending } from "@antumbra/domain-sessions/queries/pending.ts";
import { forAgent as sourceForAgent, reading as sourceReading } from "@antumbra/domain-sessions/queries/reading.ts";
import { toolCall as sourceToolCall } from "@antumbra/domain-sessions/queries/tool-call.ts";
import { transcriptSources as sourceTranscriptSources } from "@antumbra/domain-sessions/queries/transcript.ts";
import { tree as sourceTree } from "@antumbra/domain-sessions/queries/tree.ts";
import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, query } from "@shivaedev/contract/operation.ts";
import { signedIn } from "@shivaedev/contract/readPolicy.ts";
import { Schema } from "effect";
export const Request = command("request", {
	payload: sourceRequest.Input,
	success: Schema.Number,
	rejections: { ...sourceRequest.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Retry = command("retry", {
	payload: sourceRetry.Input,
	success: Schema.Number,
	rejections: { ...sourceRetry.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Charter = command("charter", {
	payload: sourceCharter.Input,
	success: Schema.Number,
	rejections: { ...sourceCharter.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Stop = command("stop", {
	payload: sourceStop.Input,
	success: Schema.Number,
	rejections: { ...sourceStop.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Operations = query("operations", {
	readPolicy: signedIn,
	payload: sourceOperations.input,
	success: sourceOperations.output,
	reads: () => [collection("sessionOperation", Schema.String).list],
});
export const Opening = query("opening", {
	readPolicy: signedIn,
	payload: sourceOpening.input,
	success: sourceOpening.output,
	reads: () => [collection("sessionOpening", Schema.String).list],
});
export const TranscriptSources = query("transcriptSources", {
	readPolicy: signedIn,
	payload: sourceTranscriptSources.input,
	success: sourceTranscriptSources.output,
	reads: () => [
		collection("sessionEvent", Schema.String).list,
		collection("session", Schema.String).list,
		collection("sessionOpening", Schema.String).list,
		collection("sessionOperation", Schema.String).list,
	],
});
export const ToolCall = query("toolCall", {
	readPolicy: signedIn,
	payload: sourceToolCall.input,
	success: sourceToolCall.output,
	reads: () => [collection("sessionToolCall", Schema.String).list],
});
export const Reading = query("reading", {
	readPolicy: signedIn,
	payload: sourceReading.input,
	success: sourceReading.output,
	reads: () => [collection("session", Schema.String).list],
});
export const Tree = query("tree", {
	readPolicy: signedIn,
	payload: sourceTree.input,
	success: sourceTree.output,
	reads: () => [collection("session", Schema.String).list],
});
export const ForAgent = query("forAgent", {
	readPolicy: signedIn,
	payload: sourceForAgent.input,
	success: sourceForAgent.output,
	reads: () => [collection("session", Schema.String).list],
});
export const Pending = query("pending", {
	readPolicy: signedIn,
	payload: sourcePending.input,
	success: sourcePending.output,
	reads: () => [collection("sessionOperation", Schema.String).list, collection("flag", Schema.String).list],
});
export const SessionsContract = contract("sessions", {
	commands: [Request, Retry, Charter, Stop],
	queries: [Operations, Opening, TranscriptSources, ToolCall, Reading, Tree, ForAgent, Pending],
});
