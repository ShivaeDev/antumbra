import type { ReadHandles } from "@antumbra/platform-feature/handles.ts";
import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { ReportsEvent } from "@antumbra/platform-vocabulary/reports-event.ts";
import { Effect } from "effect";
import { checkRequest as receipt } from "#postgres/receipt.ts";
import type { History } from "#postgres/reports/initialize.ts";
import type { piece, pieceOutcome, pieceReport, report } from "#postgres/reports/rows.ts";
export const append = (history: History) =>
	Effect.fn("ReportsHistory.append")(function* (requestId: Request, events: readonly (typeof ReportsEvent.Type)[]) {
		const current = yield* history.store.read("reports");
		return yield* history.store
			.append({ stream: "reports", requestId, expectedVersion: current.at(-1)?.streamVersion ?? 0, events })
			.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.fail(new AlreadyDone({ requestId: done.requestId, seq: done.streamVersion }))));
	});
export const read = (history: History) =>
	Effect.fn("ReportsHistory.read")(function* () {
		return yield* history.store.read("reports");
	});
export const rebuild = (history: History) =>
	Effect.fn("ReportsHistory.rebuild")(function* () {
		yield* history.store.rebuild;
	});

export const readRows = (history: History) =>
	Effect.fn("ReportsHistory.rows")(() =>
		Effect.succeed<ReadHandles<readonly [typeof report, typeof pieceReport, typeof piece, typeof pieceOutcome]>>(history.rows),
	);
export const checkRequest = receipt("reports");
