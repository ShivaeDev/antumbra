import type { ReadHandles } from "@antumbra/platform-feature/handles.ts";
import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import type { ArtifactsEvent } from "@antumbra/platform-vocabulary/artifacts-event.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import type { History } from "#postgres/artifacts/initialize.ts";
import type { artifact, piece, pieceOutcome } from "#postgres/artifacts/rows.ts";
import { checkRequest as receipt } from "#postgres/receipt.ts";
export const append = (history: History) =>
	Effect.fn("ArtifactsHistory.append")(function* (requestId: Request, events: readonly (typeof ArtifactsEvent.Type)[]) {
		const current = yield* history.store.read("artifacts");
		return yield* history.store
			.append({ stream: "artifacts", requestId, expectedVersion: current.at(-1)?.streamVersion ?? 0, events })
			.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.fail(new AlreadyDone({ requestId: done.requestId, seq: done.streamVersion }))));
	});
export const read = (history: History) =>
	Effect.fn("ArtifactsHistory.read")(function* () {
		return yield* history.store.read("artifacts");
	});
export const rebuild = (history: History) =>
	Effect.fn("ArtifactsHistory.rebuild")(function* () {
		yield* history.store.rebuild;
	});

export const readRows = (history: History) =>
	Effect.fn("ArtifactsHistory.rows")(() => Effect.succeed<ReadHandles<readonly [typeof artifact, typeof piece, typeof pieceOutcome]>>(history.rows));
export const checkRequest = receipt("artifacts");
