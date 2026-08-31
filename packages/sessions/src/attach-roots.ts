import { Database, type StoredAgentSession } from "@antumbra/persistence";
import { type Cause, Data, Effect, Option } from "effect";
import { isRootSession } from "#roots.ts";

export class SubsessionAttachRefused extends Data.TaggedError("SubsessionAttachRefused")<{
	readonly detail: string;
	readonly sessionId: string;
}> {
	override get message(): string {
		return `${this.sessionId} ${this.detail}`;
	}
}

const refusal = (sessionId: string, detail: string) => new SubsessionAttachRefused({ detail, sessionId });

const unreadable = (sessionId: string, cause: Cause.Cause<unknown>) =>
	Effect.logError("a Session could not be read to confirm it is a root", { sessionId }, cause).pipe(
		Effect.andThen(refusal(sessionId, "could not be read to confirm it is a root Session")),
	);

const rootedOrRefused = (sessionId: string, row: Option.Option<StoredAgentSession>) =>
	Option.isNone(row) || isRootSession(row.value)
		? Effect.void
		: refusal(sessionId, `is a subsession of ${row.value.parentSessionId}, read from its root's stream and never attached`);

// Subsessions share their root's provider acquisition and never attach independently.
export const makeRefuseSubsessionAttach = Effect.gen(function* () {
	const db = yield* Database;
	return (sessionId: string) =>
		db.AgentSession.where({ id: sessionId })
			.first()
			.pipe(
				Effect.catchCause((cause) => unreadable(sessionId, cause)),
				Effect.flatMap((row) => rootedOrRefused(sessionId, row)),
			);
});
