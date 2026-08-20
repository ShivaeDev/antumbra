import {
	Database,
	type StoredAgentSession,
	type WriteExecutors,
} from "@antumbra/persistence";
import { type Cause, Data, Effect, Option } from "effect";
import { isRootSession } from "#session-roots.ts";

export class SubsessionAttachRefused extends Data.TaggedError(
	"SubsessionAttachRefused",
)<{
	readonly detail: string;
	readonly sessionId: string;
}> {
	override get message(): string {
		return `${this.sessionId} ${this.detail}`;
	}
}

const refusal = (sessionId: string, detail: string) =>
	new SubsessionAttachRefused({ detail, sessionId });

// why: a row that cannot be read cannot say it is a root, and attaching on the
// assumption that it is would be the guess this seam exists to refuse.
const unreadable = (sessionId: string, cause: Cause.Cause<unknown>) =>
	Effect.logError(
		"a Session could not be read to confirm it is a root",
		{ sessionId },
		cause,
	).pipe(
		Effect.andThen(
			refusal(sessionId, "could not be read to confirm it is a root Session"),
		),
	);

const rootedOrRefused = (
	sessionId: string,
	row: Option.Option<StoredAgentSession>,
) =>
	Option.isNone(row) || isRootSession(row.value)
		? Effect.void
		: refusal(
				sessionId,
				`is a subsession of ${row.value.parentSessionId}, read from its root's stream and never attached`,
			);

// why: only a root may be attached to a provider. A subsession is part of its
// root's record — its conversation is one the root is still holding, and on at
// least one provider attaching to it mutates it — so handing a child's id to a
// resume, a drain or a restore is refused here rather than reasoned about at
// each caller. The roots-only selection upstream is what normally keeps a child
// from getting this far; this is the seam that makes it impossible.
export const makeRefuseSubsessionAttach = Effect.gen(function* () {
	const db = yield* Database;
	const executors = yield* Effect.context<WriteExecutors>();
	return (sessionId: string) =>
		db.AgentSession.where({ id: sessionId })
			.first()
			.pipe(
				Effect.provideContext(executors),
				Effect.catchCause((cause) => unreadable(sessionId, cause)),
				Effect.flatMap((row) => rootedOrRefused(sessionId, row)),
			);
});
