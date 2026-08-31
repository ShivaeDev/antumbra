import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { ChangeNotFound, ChangeStillAlive } from "#errors.ts";

const landVerdict = (changeId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const change = yield* db.Change.where({ id: changeId }).first();
		if (Option.isNone(change)) {
			return yield* new ChangeNotFound({ changeId });
		}
		if (change.value.stage !== "withdrawn") {
			return yield* new ChangeStillAlive({
				changeId,
				stage: change.value.stage,
			});
		}
		const standing = yield* db.ChangeVerdict.where({ changeId }).first();
		if (Option.isSome(standing)) {
			return false;
		}
		return yield* db.ChangeVerdict.create({
			changeId,
			verdict: "dismissed",
		}).pipe(
			Effect.as(true),
			Effect.catchTag("PrismaError", (failure) =>
				db.ChangeVerdict.where({ changeId })
					.exists()
					.pipe(Effect.flatMap((exists) => (exists ? Effect.succeed(false) : Effect.fail(failure)))),
			),
		);
	});

export const dismissChange = (changeId: string) =>
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		const landed = yield* landVerdict(changeId);
		if (landed) {
			yield* feeds.publishVoyageRefresh();
		}
	});
