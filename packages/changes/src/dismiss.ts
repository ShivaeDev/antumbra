import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, Writer } from "@antumbra/persistence";
import { Effect, Option, PubSub } from "effect";
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
		yield* db.ChangeVerdict.create({ changeId, verdict: "dismissed" });
		return true;
	});

// why: the terminal acknowledgement a dead change never had. It settles what
// the change is owed without touching the change itself — the row keeps saying
// what happened to it, and the verdict beside it says the admiral has read it.
// Dismissing twice is the same fact, so it lands once and rings once.
export const dismissChange = (changeId: string) =>
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		const writer = yield* Writer;
		const landed = yield* writer.write(landVerdict(changeId));
		if (landed) {
			yield* PubSub.publish(feeds.voyages, undefined);
		}
	});
