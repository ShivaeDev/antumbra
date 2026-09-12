import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Effect, Option, Schema } from "effect";
import { smoothingAttempt } from "#smoothing/attempt.ts";
import { SmoothingTarget } from "#smoothing/targets.ts";

const { entries: _entries, ...target } = SmoothingTarget.fields;
export const smoothingSession = row(
	"smoothingSession",
	{
		sessionId: Schema.String,
		attemptId: Schema.String,
		agentId: Schema.String,
		...target,
		status: Schema.Literals(["waiting", "written", "empty", "silent", "timedOut"]),
	},
	{ key: "sessionId", scope: "attemptId" },
);

const { status: _status, ...binding } = smoothingSession.fields;
export const smoothingSessionBound = fact("SmoothingSessionBound", binding);
export const bindSmoothingSession = command("bindSmoothingSession", {
	input: binding,
	reads: [smoothingAttempt],
	emits: smoothingSessionBound,
	rejections: { UnknownAttempt: { id: Schema.String } },
	run: Effect.fn("boards.bindSmoothingSession")(function* (input, rows, reject) {
		if (!(yield* rows.smoothingAttempt.exists(input.attemptId))) return yield* reject.UnknownAttempt({ id: input.attemptId });
		return {
			sessionId: input.sessionId,
			attemptId: input.attemptId,
			agentId: input.agentId,
			board: input.board,
			pieceId: input.pieceId,
			title: input.title,
			level: input.level,
			coversFrom: input.coversFrom,
			coversTo: input.coversTo,
		};
	}),
});
export const smoothingSessionBoundMaterializer = materializer(smoothingSessionBound, {
	writes: [smoothingSession],
	run: Effect.fn("boards.SmoothingSessionBound")(function* (fact, rows) {
		yield* rows.smoothingSession.insert({
			sessionId: fact.sessionId,
			attemptId: fact.attemptId,
			agentId: fact.agentId,
			board: fact.board,
			pieceId: fact.pieceId,
			title: fact.title,
			level: fact.level,
			coversFrom: fact.coversFrom,
			coversTo: fact.coversTo,
			status: "waiting",
		});
	}),
});

export const smoothingSessionFinished = fact("SmoothingSessionFinished", {
	sessionId: Schema.String,
	status: Schema.Literals(["written", "empty", "silent", "timedOut"]),
});
export const finishSmoothingSession = command("finishSmoothingSession", {
	input: smoothingSessionFinished.payload,
	reads: [smoothingSession],
	emits: smoothingSessionFinished,
	rejections: { UnknownSession: { id: Schema.String }, Settled: { id: Schema.String } },
	run: Effect.fn("boards.finishSmoothingSession")(function* (input, rows, reject) {
		const held = yield* rows.smoothingSession.find(input.sessionId);
		if (Option.isNone(held)) return yield* reject.UnknownSession({ id: input.sessionId });
		if (held.value.status !== "waiting") return yield* reject.Settled({ id: input.sessionId });
		return { sessionId: input.sessionId, status: input.status };
	}),
});
export const smoothingSessionFinishedMaterializer = materializer(smoothingSessionFinished, {
	writes: [smoothingSession],
	run: Effect.fn("boards.SmoothingSessionFinished")(function* (fact, rows) {
		yield* rows.smoothingSession.update(fact.sessionId, { status: fact.status });
	}),
});

export const smoothingSessionFor = query("smoothingSessionFor", {
	input: { sessionId: Schema.String },
	output: Schema.NullOr(Schema.Struct({ ...smoothingSession.fields, voyageId: smoothingAttempt.fields.voyageId })),
	reads: [smoothingSession, smoothingAttempt],
	run: Effect.fn("boards.smoothingSessionFor")(function* (input, rows) {
		const held = yield* rows.smoothingSession.find(input.sessionId);
		if (Option.isNone(held)) return null;
		const attempt = yield* rows.smoothingAttempt.get(held.value.attemptId);
		return { ...held.value, voyageId: attempt.voyageId };
	}),
});
