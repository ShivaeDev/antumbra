import { WAKE_SWITCHES } from "@antumbra/domain-mail/queries/due-mail.ts";
import type { DueWake } from "@antumbra/domain-mail/queries/due-wakes.ts";
import { allows, ungated } from "@antumbra/domain-settings/queries/flags.ts";
import { quietIds } from "@antumbra/domain-voyages/rows/voyage.ts";
import { mailWords } from "@antumbra/platform-prompts/mail.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Mail } from "@antumbra/server-mail/service.ts";
import { Sessions } from "@antumbra/server-sessions/service.ts";
import { Settings } from "@antumbra/server-settings/service.ts";
import { Voyages } from "@antumbra/server-voyages/service.ts";
import { Clock, Effect } from "effect";

export const deliver = Effect.fn("Mail.deliver")(function* (due: ReadonlyArray<DueWake>) {
	const settingsService = yield* Settings;
	const voyagesService = yield* Voyages;
	const sessionsService = yield* Sessions;
	const mailService = yield* Mail;

	const chosen = yield* settingsService.flags({}).pipe(Effect.orDie);
	const quiet = quietIds(yield* voyagesService.list().pipe(Effect.orDie));
	for (const wake of due) {
		if (!allows(chosen, WAKE_SWITCHES[wake.batch.precedence])) continue;
		if (wake.voyageId !== null && quiet.has(wake.voyageId)) continue;
		const requestId = Request.make(`mail-wake:${wake.sessionId}:${wake.unreadIds.toSorted().join(":")}`);
		const held = yield* sessionsService.operations({ sessionId: wake.sessionId }).pipe(Effect.orDie);
		if (
			held.some(
				(operation) =>
					String(operation.id) !== requestId &&
					operation.kind === "wake" &&
					operation.status !== "accepted" &&
					operation.status !== "cancelled" &&
					ungated(chosen, operation.gatedBy),
			)
		)
			continue;
		const at = yield* Clock.currentTimeMillis;
		const accepted = yield* sessionsService
			.request({
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
		yield* mailService.markDelivered({ requestId: Request.make(`mail-delivered:${requestId}`), agentId: wake.agentId, ids: wake.unreadIds }).pipe(
			Effect.catchTag("AlreadyDone", () => Effect.void),
			Effect.orDie,
		);
	}
});
