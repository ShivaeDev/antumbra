import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Schema } from "effect";
import { smoothingAttempt } from "#smoothing/attempt.ts";

export const smoothingFinished = fact("SmoothingFinished", {
	id: Schema.String,
	status: Schema.Literals(["succeeded", "failed"]),
	detail: Schema.NullOr(Schema.String),
});
export const finishSmoothing = command("finishSmoothing", {
	input: smoothingFinished.payload,
	reads: [smoothingAttempt],
	emits: smoothingFinished,
	rejections: { UnknownAttempt: { id: Schema.String } },
	run: Effect.fn("boards.finishSmoothing")(function* (input, rows, reject) {
		if (!(yield* rows.smoothingAttempt.exists(input.id))) return yield* reject.UnknownAttempt({ id: input.id });
		return { id: input.id, status: input.status, detail: input.detail };
	}),
});
export const smoothingFinishedMaterializer = materializer(smoothingFinished, {
	writes: [smoothingAttempt],
	run: Effect.fn("boards.SmoothingFinished")(function* (fact, rows) {
		yield* rows.smoothingAttempt.update(fact.id, { status: fact.status, detail: fact.detail });
	}),
});
