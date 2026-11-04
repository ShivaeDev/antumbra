import { bindSmoothingSession } from "@antumbra/domain-boards/commands/bind-smoothing-session.ts";
import { finishSmoothing } from "@antumbra/domain-boards/commands/finish-smoothing.ts";
import { finishSmoothingSession } from "@antumbra/domain-boards/commands/finish-smoothing-session.ts";
import { requestSmoothing } from "@antumbra/domain-boards/commands/request-smoothing.ts";
import { summarize } from "@antumbra/domain-boards/commands/summarize.ts";
import { summarizePiece } from "@antumbra/domain-boards/commands/summarize-piece.ts";
import { write } from "@antumbra/domain-boards/commands/write.ts";
import { digest } from "@antumbra/domain-boards/queries/digest.ts";
import { display } from "@antumbra/domain-boards/queries/display.ts";
import { dueSmoothing } from "@antumbra/domain-boards/queries/due-smoothing.ts";
import { entries } from "@antumbra/domain-boards/queries/entries.ts";
import { smoothingSessionFor } from "@antumbra/domain-boards/queries/smoothing-session-for.ts";
import { smoothingState } from "@antumbra/domain-boards/queries/smoothing-state.ts";
import { pendingSmoothing, smoothingTargets } from "@antumbra/domain-boards/queries/smoothing-targets.ts";
import { under } from "@antumbra/domain-boards/queries/under.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, query } from "@shivaedev/contract/operation.ts";
import { Effect, Schema } from "effect";
export const Write = command("write", { payload: write.Input, success: Schema.Number, rejections: write.Rejection, invalidates: () => [] });
export const Summarize = command("summarize", {
	payload: summarize.Input,
	success: Schema.Number,
	rejections: summarize.Rejection,
	invalidates: () => [],
});
export const SummarizePiece = command("summarizePiece", {
	payload: summarizePiece.Input,
	success: Schema.Number,
	rejections: summarizePiece.Rejection,
	invalidates: () => [],
});
export const RequestSmoothing = command("requestSmoothing", {
	payload: requestSmoothing.Input,
	success: Schema.Number,
	rejections: requestSmoothing.Rejection,
	invalidates: () => [],
});
export const FinishSmoothing = command("finishSmoothing", {
	payload: finishSmoothing.Input,
	success: Schema.Number,
	rejections: finishSmoothing.Rejection,
	invalidates: () => [],
});
export const BindSmoothingSession = command("bindSmoothingSession", {
	payload: bindSmoothingSession.Input,
	success: Schema.Number,
	rejections: bindSmoothingSession.Rejection,
	invalidates: () => [],
});
export const FinishSmoothingSession = command("finishSmoothingSession", {
	payload: finishSmoothingSession.Input,
	success: Schema.Number,
	rejections: finishSmoothingSession.Rejection,
	invalidates: () => [],
});
export const Display = query("display", {
	payload: display.input,
	success: display.output,
	reads: (input) => [collection("boardEntry", Schema.String).item(input.board)],
	readPolicy: () => Effect.succeed(true),
});
export const Entries = query("entries", {
	payload: entries.input,
	success: entries.output,
	reads: (input) => [collection("boardEntry", Schema.String).item(input.board)],
	readPolicy: () => Effect.succeed(true),
});
export const Digest = query("digest", {
	payload: digest.input,
	success: digest.output,
	reads: (input) => [collection("boardEntry", Schema.String).item(input.board)],
	readPolicy: () => Effect.succeed(true),
});
export const Under = query("under", {
	payload: under.input,
	success: under.output,
	reads: (input) => [collection("boardEntry", Schema.String).item(input.board)],
	readPolicy: () => Effect.succeed(true),
});
export const DueSmoothing = query("dueSmoothing", {
	payload: dueSmoothing.input,
	success: dueSmoothing.output,
	reads: () => [
		collection("smoothingAttempt", Schema.String).list,
		collection("voyage", Schema.String).list,
		collection("piece", Schema.String).list,
		collection("pieceProgress", Schema.String).list,
		collection("boardEntry", Schema.String).list,
	],
	readPolicy: () => Effect.succeed(true),
});
export const SmoothingTargets = query("smoothingTargets", {
	payload: smoothingTargets.input,
	success: smoothingTargets.output,
	reads: () => [
		collection("smoothingAttempt", Schema.String).list,
		collection("piece", Schema.String).list,
		collection("pieceProgress", Schema.String).list,
		collection("boardEntry", Schema.String).list,
	],
	readPolicy: () => Effect.succeed(true),
});
export const PendingSmoothing = query("pendingSmoothing", {
	payload: pendingSmoothing.input,
	success: pendingSmoothing.output,
	reads: () => [collection("smoothingAttempt", Schema.String).list, collection("flag", Schema.String).list, collection("voyage", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const SmoothingSessionFor = query("smoothingSessionFor", {
	payload: smoothingSessionFor.input,
	success: smoothingSessionFor.output,
	reads: () => [collection("smoothingSession", Schema.String).list, collection("smoothingAttempt", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const SmoothingState = query("smoothingState", {
	payload: smoothingState.input,
	success: smoothingState.output,
	reads: () => [
		collection("smoothingAttempt", Schema.String).list,
		collection("boardEntry", Schema.String).list,
		collection("pieceProgress", Schema.String).list,
	],
	readPolicy: () => Effect.succeed(true),
});
export const BoardsContract = contract("boards", {
	commands: [Write, Summarize, SummarizePiece, RequestSmoothing, FinishSmoothing, BindSmoothingSession, FinishSmoothingSession],
	queries: [Display, Entries, Digest, Under, DueSmoothing, SmoothingTargets, PendingSmoothing, SmoothingSessionFor, SmoothingState],
});
