import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Effect, Option, Stream } from "effect";
import { rawOf, type ScriptedBackend } from "#scripted/backend.ts";

export const endsTurn = (scripted: ScriptedBackend, sessionId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const feeds = yield* DomainFeeds;
		const session = yield* scripted.session(sessionId);
		if (session === undefined) {
			return yield* Effect.die(`the session was never opened: ${sessionId}`);
		}
		const refreshes = yield* feeds.subscribeFleetRefresh();
		yield* session.emit({ durationMs: 1, raw: rawOf("turn/completed"), status: "completed", type: "turn.completed" });
		const read = db.AgentSession.where({ id: sessionId }).first().pipe(Effect.map(Option.getOrThrow));
		yield* Stream.fromEffect(read).pipe(
			Stream.concat(Stream.fromSubscription(refreshes).pipe(Stream.mapEffect(() => read))),
			Stream.filter((row) => row.executionStatus === "idle"),
			Stream.runHead,
		);
	}).pipe(Effect.scoped, Effect.orDie, Effect.asVoid);
