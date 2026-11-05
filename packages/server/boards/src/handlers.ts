import { BoardsContract } from "@antumbra/server-boards/contract.ts";
import { Effect, Layer } from "effect";
import { Boards } from "#service.ts";
export const handlers = BoardsContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Boards;
		return BoardsContract.application.of({
			"boards.write": (input) =>
				service
					.write(input)
					.pipe(Effect.catchIf((error) => error._tag !== "Blank" && error._tag !== "UnknownBoard" && error._tag !== "AlreadyDone", Effect.die)),
			"boards.summarize": (input) =>
				service.summarize(input).pipe(Effect.catchIf((error) => error._tag !== "Blank" && error._tag !== "AlreadyDone", Effect.die)),
			"boards.summarizePiece": (input) =>
				service.summarizePiece(input).pipe(Effect.catchIf((error) => error._tag !== "Blank" && error._tag !== "AlreadyDone", Effect.die)),
			"boards.requestSmoothing": (input) =>
				service
					.requestSmoothing(input)
					.pipe(Effect.catchIf((error) => error._tag !== "UnknownVoyage" && error._tag !== "WrongPiece" && error._tag !== "AlreadyDone", Effect.die)),
			"boards.finishSmoothing": (input) =>
				service.finishSmoothing(input).pipe(Effect.catchIf((error) => error._tag !== "UnknownAttempt" && error._tag !== "AlreadyDone", Effect.die)),
			"boards.bindSmoothingSession": (input) =>
				service
					.bindSmoothingSession(input)
					.pipe(Effect.catchIf((error) => error._tag !== "UnknownAttempt" && error._tag !== "AlreadyDone", Effect.die)),
			"boards.finishSmoothingSession": (input) =>
				service
					.finishSmoothingSession(input)
					.pipe(Effect.catchIf((error) => error._tag !== "UnknownSession" && error._tag !== "Settled" && error._tag !== "AlreadyDone", Effect.die)),
			"boards.display": (input) => service.display(input).pipe(Effect.orDie),
			"boards.entries": (input) => service.entries(input).pipe(Effect.orDie),
			"boards.digest": (input) => service.digest(input).pipe(Effect.orDie),
			"boards.under": (input) => service.under(input).pipe(Effect.orDie),
			"boards.dueSmoothing": (input) => service.dueSmoothing(input).pipe(Effect.orDie),
			"boards.smoothingTargets": (input) => service.smoothingTargets(input).pipe(Effect.orDie),
			"boards.pendingSmoothing": (input) => service.pendingSmoothing(input).pipe(Effect.orDie),
			"boards.smoothingSessionFor": (input) => service.smoothingSessionFor(input).pipe(Effect.orDie),
			"boards.smoothingState": (input) => service.smoothingState(input).pipe(Effect.orDie),
		});
	}),
);
export const boards = handlers.pipe(Layer.provideMerge(Boards.layer));
