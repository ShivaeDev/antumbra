import { markDelivered } from "@antumbra/domain-mail/commands/mark-delivered.ts";
import type { DueWake } from "@antumbra/domain-mail/queries/due-wakes.ts";
import { request } from "@antumbra/domain-sessions/commands/request.ts";
import { operations } from "@antumbra/domain-sessions/queries/operations.ts";
import { flags } from "@antumbra/domain-settings/queries/flags.ts";
import { mailWords } from "@antumbra/platform-prompts/mail.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Clock, Effect } from "effect";

export const deliver = Effect.fn("Mail.deliver")(function* (due: ReadonlyArray<DueWake>) {
	const live = yield* Live;
	const commit = yield* Commit;
	const chosen = yield* live.read(flags, {});
	if (chosen.some((flag) => flag.on && (flag.key === "holdEverything" || flag.key === "holdWakes"))) return;
	for (const wake of due) {
		const requestId = Request.make(`mail-wake:${wake.sessionId}:${wake.unreadIds.toSorted().join(":")}`);
		const held = yield* live.read(operations, { sessionId: wake.sessionId });
		if (
			held.some(
				(operation) =>
					String(operation.id) !== requestId && operation.kind === "wake" && operation.status !== "accepted" && operation.status !== "cancelled",
			)
		)
			continue;
		const at = yield* Clock.currentTimeMillis;
		const accepted = yield* commit
			.commit(request, {
				requestId,
				sessionId: wake.sessionId,
				kind: "wake",
				inputId: null,
				reason: mailWords(wake.batch),
				requestedAt: new Date(at).toISOString(),
			})
			.pipe(
				Effect.as(true),
				Effect.catchTag("AlreadyDone", () => Effect.succeed(true)),
				Effect.catchTags({ Busy: () => Effect.succeed(false), Unavailable: () => Effect.succeed(false) }),
			);
		if (!accepted) continue;
		yield* commit.commit(markDelivered, { requestId: Request.make(`mail-delivered:${requestId}`), agentId: wake.agentId, ids: wake.unreadIds }).pipe(
			Effect.catchTag("AlreadyDone", () => Effect.void),
			Effect.orDie,
		);
	}
});
