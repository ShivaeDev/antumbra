import { Database, type PrismaError } from "@antumbra/persistence";
import { Clock, type Context, Effect } from "effect";
import { announce } from "#transitions.ts";

const transientConnection = (failure: PrismaError): boolean => failure.reason._tag === "PrismaConnectionFailure" && failure.reason.transient === true;

const retryWaitingRow = (id: string, expectedDetail: string): Effect.Effect<boolean, PrismaError, Context.Service.Identifier<typeof Database>> =>
	Effect.gen(function* () {
		const db = yield* Database;
		const now = yield* Clock.currentTimeMillis;
		const updated = yield* db.Intent.where({
			detail: expectedDetail,
			id,
			status: "waiting",
		}).update({ status: "queued", updatedAt: new Date(now) });
		return updated !== null;
	}).pipe(
		Effect.catchTag("PrismaError", (failure) =>
			transientConnection(failure) ? Effect.yieldNow.pipe(Effect.andThen(retryWaitingRow(id, expectedDetail))) : Effect.fail(failure),
		),
	);

export const retryIntentIfWaiting = (id: string, expectedDetail: string) =>
	Effect.gen(function* () {
		const updated = yield* retryWaitingRow(id, expectedDetail);
		if (!updated) {
			return false;
		}
		yield* announce({ id, status: "queued" });
		return true;
	});
