import type { ReadHandles } from "@antumbra/platform-feature/handles.ts";
import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { transact } from "@shivaedev/sql/transact.ts";
import { Effect } from "effect";
import type { History } from "#postgres/changes/initialize.ts";
import { prune } from "#postgres/changes/refresh.ts";
import type {
	agent,
	berth,
	change,
	changeAdoptionRequest,
	changeFeedback,
	changeHostCapability,
	changeRefresh,
	changeTransition,
	changeVerdict,
	heldResource,
	moorage,
	piece,
	pieceAgent,
	pieceChange,
	pieceChangeView,
	pieceOutcome,
	quayChange,
	repo,
	resourceOwner,
	session,
	sessionSituation,
	voyage,
	voyageActivity,
} from "#postgres/changes/rows.ts";
import { checkRequest as receipt } from "#postgres/receipt.ts";
export const append = (history: History) =>
	Effect.fn("ChangesHistory.append")(function* (requestId: Request, events: readonly (typeof ChangesEvent.Type)[]) {
		const current = yield* history.store.read("changes");
		return yield* history.store
			.append({ stream: "changes", requestId, expectedVersion: current.at(-1)?.streamVersion ?? 0, events })
			.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.fail(new AlreadyDone({ requestId: done.requestId, seq: done.streamVersion }))));
	});
export const read = (history: History) =>
	Effect.fn("ChangesHistory.read")(function* () {
		return yield* history.store.read("changes");
	});
export const rebuild = (history: History) =>
	Effect.fn("ChangesHistory.rebuild")(function* () {
		yield* transact(
			Effect.gen(function* () {
				yield* history.store.rebuild;
				yield* prune();
			}),
			{ onSqlError: (error) => error },
		);
	});

export const readRows = (history: History) =>
	Effect.fn("ChangesHistory.rows")(() =>
		Effect.succeed<
			ReadHandles<
				readonly [
					typeof resourceOwner,
					typeof pieceChangeView,
					typeof changeHostCapability,
					typeof sessionSituation,
					typeof changeRefresh,
					typeof changeAdoptionRequest,
					typeof session,
					typeof voyage,
					typeof quayChange,
					typeof change,
					typeof pieceChange,
					typeof changeTransition,
					typeof changeVerdict,
					typeof changeFeedback,
					typeof piece,
					typeof repo,
					typeof berth,
					typeof moorage,
					typeof agent,
					typeof pieceOutcome,
					typeof heldResource,
					typeof voyageActivity,
					typeof pieceAgent,
				]
			>
		>(history.rows),
	);
export const checkRequest = receipt("changes");
