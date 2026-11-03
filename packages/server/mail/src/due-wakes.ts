import { dueMail, quietEnd } from "@antumbra/domain-mail/queries/due-mail.ts";
import { DueWake } from "@antumbra/domain-mail/queries/due-wakes.ts";
import { MailHistory } from "@antumbra/server-journal/postgres/mail/service.ts";
import { Clock, Effect, Schema } from "effect";
import { unread } from "#read.ts";

export const dueWakes = Effect.fn("Mail.dueWakes")(function* () {
	const history = yield* MailHistory;
	const evidence = yield* history.wakeEvidence();
	if (evidence === null) return { wakes: [], waitUntil: null };
	const now = yield* Clock.currentTimeMillis;
	const alive = new Set(evidence.agents.filter((row) => row.status === "alive").map((row) => row.id));
	const crew = new Map(evidence.crew.map((row) => [row.agentId, row.voyageId]));
	const wakes: DueWake[] = [];
	let waitUntil: number | null = null;
	for (const root of evidence.sessions) {
		if (
			root.status !== "open" ||
			root.executionStatus !== "idle" ||
			root.parentSessionId !== null ||
			root.stoppedAt !== null ||
			!alive.has(root.agentId)
		)
			continue;
		const waiting = yield* unread({ agentId: root.agentId });
		const batch = dueMail(waiting, now, evidence.quietMillis);
		if (batch === undefined) {
			const next = quietEnd(waiting, evidence.quietMillis);
			if (next !== undefined && (waitUntil === null || next < waitUntil)) waitUntil = next;
			continue;
		}
		const wake = yield* Schema.decodeUnknownEffect(DueWake)({
			agentId: root.agentId,
			sessionId: root.id,
			voyageId: crew.get(root.agentId) ?? null,
			batch,
			unreadIds: waiting.map((row) => row.id),
			waitedMillis: now - Math.min(...waiting.map((row) => Date.parse(row.sentAt))),
		});
		wakes.push(wake);
	}
	return { wakes, waitUntil };
});
