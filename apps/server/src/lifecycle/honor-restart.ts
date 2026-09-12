import { clear } from "@antumbra/domain-lifecycle/commands/clear.ts";
import { pending } from "@antumbra/domain-lifecycle/queries/pending.ts";
import { request } from "@antumbra/domain-sessions/commands/request.ts";
import { wakeWords } from "@antumbra/platform-prompts/wake.ts";
import { LifecycleRefused } from "@antumbra/platform-runner/lifecycle.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Clock, Effect } from "effect";

export const honorRestart = Effect.fn("Lifecycle.honorRestart")(function* ({ requestId }: { readonly requestId: string }) {
	const commit = yield* Commit;
	const live = yield* Live;
	const sessions = yield* live.read(pending, {});
	if (sessions.length === 0) return;
	const consumed = yield* commit.commit(clear, { requestId: Request.make(requestId) }).pipe(
		Effect.as(true),
		Effect.catchTag("AlreadyDone", () => Effect.succeed(false)),
	);
	if (!consumed) return;
	const requestedAt = new Date(yield* Clock.currentTimeMillis).toISOString();
	for (const sessionId of sessions) {
		yield* commit
			.commit(request, {
				requestId: Request.make(`${requestId}:${sessionId}`),
				sessionId,
				kind: "wake",
				inputId: null,
				reason: wakeWords,
				requestedAt,
			})
			.pipe(
				Effect.catchTag("AlreadyDone", () => Effect.void),
				Effect.mapError((failure) => new LifecycleRefused({ message: failure.message })),
			);
	}
});
