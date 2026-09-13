import { failLoop } from "@antumbra/domain-supervision/commands/loop-failed.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import type { CommitService } from "@antumbra/server-journal/commit.ts";
import { type Cause, Effect } from "effect";
import { failureOf } from "#supervision/failure.ts";

const written = (commit: CommitService, name: string, message: string, trace: string) =>
	commit.commit(failLoop, { loop: name, message, requestId: Id.Request.make(Id.make()), trace }).pipe(
		Effect.asVoid,
		Effect.catchCause((cause) => Effect.logError(`the ${name} loop stop went unrecorded`, cause)),
	);

export const recordDefect = Effect.fn("Supervision.recordDefect")(function* (commit: CommitService, name: string, cause: Cause.Cause<unknown>) {
	yield* Effect.logError(`the ${name} loop stopped on an error`, cause);
	const failure = failureOf(cause);
	yield* written(commit, name, failure.message, failure.trace);
});

export const recordEnd = Effect.fn("Supervision.recordEnd")(function* (commit: CommitService, name: string) {
	yield* Effect.logWarning(`the ${name} loop ended`);
	yield* written(commit, name, `${name} ended.`, "");
});
