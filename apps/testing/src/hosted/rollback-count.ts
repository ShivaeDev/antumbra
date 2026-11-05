import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { SettingsHistory } from "@antumbra/server-storage/settings/service.ts";
import { transact } from "@shivaedev/sql/transact.ts";
import { Data, Effect } from "effect";

class Rejected extends Data.TaggedError("HostedStoryRejected") {}
export const rollbackCount = Effect.fn("HostedStory.rollbackCount")(function* (count: number) {
	const history = yield* SettingsHistory;
	yield* transact(
		history
			.append(Request.make("rolled-back-count"), [{ _tag: "CountSet", key: "maxParallelSessions", count, at: 0 }])
			.pipe(Effect.andThen(Effect.fail(new Rejected()))),
		{ onSqlError: (error) => error },
	).pipe(Effect.catchTag("HostedStoryRejected", () => Effect.void));
});
