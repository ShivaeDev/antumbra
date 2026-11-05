import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Supervision } from "@antumbra/server-supervision/service.ts";
import { type Cause, Effect } from "effect";
import { failureOf } from "#supervision/failure.ts";

const written = (name: string, message: string, trace: string) =>
	Supervision.use((service) => service.failLoop({ loop: name, message, requestId: Id.Request.make(Id.make()), trace })).pipe(
		Effect.asVoid,
		Effect.catchCause((cause) => Effect.logError(`the ${name} loop stop went unrecorded`, cause)),
	);

export const recordDefect = Effect.fn("Supervision.recordDefect")(function* (name: string, cause: Cause.Cause<unknown>) {
	yield* Effect.logError(`the ${name} loop stopped on an error`, cause);
	const failure = failureOf(cause);
	yield* written(name, failure.message, failure.trace);
});

export const recordEnd = Effect.fn("Supervision.recordEnd")(function* (name: string) {
	yield* Effect.logWarning(`the ${name} loop ended`);
	yield* written(name, `${name} ended.`, "");
});
