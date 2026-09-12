import { Schema } from "effect";
import { DeliveryAct, Input } from "#input.ts";
import { LogEntry } from "#log.ts";
import { CaptureChange, ChangeEvidence, Provision, PushChange, Reclaim, Scrap } from "#resources.ts";
import { ToolSet } from "#tools.ts";

const identity = { requestId: Schema.String, sessionId: Schema.String };
export const SessionOptions = Schema.Struct({
	agentId: Schema.String,
	backend: Schema.String,
	cwd: Schema.String,
	model: Schema.NullOr(Schema.String),
	effort: Schema.NullOr(Schema.String),
	constrainedPrompt: Schema.NullOr(Schema.String),
	toolSet: ToolSet,
});
export type SessionOptions = typeof SessionOptions.Type;
export const Start = Schema.Struct({ type: Schema.Literal("Start"), ...identity, options: SessionOptions, charter: Input });
export const Wake = Schema.Struct({
	type: Schema.Literal("Wake"),
	...identity,
	options: SessionOptions,
	nativeRef: Schema.String,
	instruction: Input,
});
export const Deliver = Schema.Struct({ type: Schema.Literal("Deliver"), ...identity, act: DeliveryAct, input: Input });
export const Interrupt = Schema.Struct({ type: Schema.Literal("Interrupt"), ...identity });
export const Sleep = Schema.Struct({ type: Schema.Literal("Sleep"), ...identity });
export const Stop = Schema.Struct({ type: Schema.Literal("Stop"), ...identity, reason: Schema.String });
export const Drain = Schema.Struct({ type: Schema.Literal("Drain"), requestId: Schema.String });
export const ReadLog = Schema.Struct({ type: Schema.Literal("ReadLog"), requestId: Schema.String, logId: Schema.String, after: Schema.Int });
export const ReadArtifact = Schema.Struct({
	type: Schema.Literal("ReadArtifact"),
	requestId: Schema.String,
	agentId: Schema.String,
	moorageRoot: Schema.String,
	relativePath: Schema.String,
});
export const Operation = Schema.Union([
	Start,
	Wake,
	Deliver,
	Interrupt,
	Sleep,
	Stop,
	Drain,
	ReadLog,
	ReadArtifact,
	Provision,
	Reclaim,
	Scrap,
	CaptureChange,
	PushChange,
]);
export type Operation = typeof Operation.Type;
export const OperationResult = Schema.Union([
	Schema.Struct({ type: Schema.Literal("Accepted") }),
	Schema.Struct({ type: Schema.Literal("LogRead"), entries: Schema.Array(LogEntry) }),
	Schema.Struct({ type: Schema.Literal("Refused"), reason: Schema.String }),
	Schema.Struct({ type: Schema.Literal("ChangeCaptured"), evidence: ChangeEvidence }),
	Schema.Struct({ type: Schema.Literal("Reclaimed"), verdict: Schema.Literals(["dirty", "reclaimed"]) }),
	Schema.Struct({ type: Schema.Literal("ArtifactRead"), name: Schema.String, content: Schema.String }),
]);
export type OperationResult = typeof OperationResult.Type;
export const Reply = Schema.Struct({ runnerId: Schema.String, requestId: Schema.String, result: OperationResult });
export type Reply = typeof Reply.Type;
