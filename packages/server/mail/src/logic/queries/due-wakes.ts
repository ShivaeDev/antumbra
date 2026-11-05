import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { dueMail, MailBatch, quietEnd } from "@antumbra/domain-mail/queries/due-mail.ts";
import type * as Source from "@antumbra/domain-mail/queries/due-wakes.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { COUNTS } from "@antumbra/domain-settings/queries/counts.ts";
import { MessageId } from "@antumbra/platform-vocabulary/mail.ts";
import { FLEET } from "@antumbra/platform-vocabulary/settings-ids.ts";
import { selection as agentSelection } from "@antumbra/server-storage/records/agent.ts";
import { selection as countSelection } from "@antumbra/server-storage/records/count.ts";
import { selection as messageSelection } from "@antumbra/server-storage/records/message.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as voyageAgentSelection } from "@antumbra/server-storage/records/voyage-agent.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Clock, Effect, Schema } from "effect";

export const DueWake = Schema.Struct({
	agentId: agent.fields.id,
	sessionId: session.fields.id,
	voyageId: Schema.NullOr(voyageAgent.fields.voyageId),
	batch: MailBatch,
	unreadIds: Schema.Array(MessageId),
	waitedMillis: Schema.Number,
});
export type DueWake = typeof DueWake.Type;

export const dueWakes = Effect.fn("mail.dueWakes")(function* (
	_input: Schema.Struct.Type<typeof Source.dueWakes.input>,
): Effect.fn.Return<typeof Source.dueWakes.output.Type, never, Records> {
	const rows = yield* Records;

	const settings = yield* rows.count
		.findMany({ where: { scope: FLEET }, orderBy: { field: "storage_order", direction: "asc" }, select: countSelection })
		.pipe(Effect.orDie);
	const quietMillis = (settings.find((value) => value.key === "routineMailMinutes")?.count ?? COUNTS.routineMailMinutes.fallback) * 60_000;
	const nowMillis = yield* Clock.currentTimeMillis;
	const alive = new Map(
		(yield* rows.agent
			.findMany({ where: { status: "alive" }, orderBy: { field: "storage_order", direction: "asc" }, select: agentSelection })
			.pipe(Effect.orDie)).map((value) => [String(value.id), value.id]),
	);
	const sailing = new Map(
		(yield* rows.voyageAgent
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: voyageAgentSelection })
			.pipe(Effect.orDie)).map((crew) => [String(crew.agentId), crew.voyageId]),
	);
	const resting = yield* rows.session
		.findMany({
			where: { status: "open", executionStatus: "idle", parentSessionId: null },
			orderBy: { field: "storage_order", direction: "asc" },
			select: sessionSelection,
		})
		.pipe(Effect.orDie);
	const wakes: DueWake[] = [];
	let waitUntil: number | null = null;
	for (const root of resting) {
		if (root.stoppedAt !== null) continue;
		const ownerId = alive.get(root.agentId);
		if (ownerId === undefined) continue;
		const unread = (yield* rows.message
			.findMany({ where: { toAgentId: root.agentId }, orderBy: { field: "sent_order", direction: "asc" }, select: messageSelection })
			.pipe(Effect.orDie)).filter((held) => held.readAt === null);
		const batch = dueMail(unread, nowMillis, quietMillis);
		if (batch === undefined) {
			const next = quietEnd(unread, quietMillis);
			if (next !== undefined && (waitUntil === null || next < waitUntil)) waitUntil = next;
			continue;
		}
		wakes.push({
			agentId: ownerId,
			sessionId: root.id,
			voyageId: sailing.get(String(ownerId)) ?? null,
			batch,
			unreadIds: unread.map((held) => held.id),
			waitedMillis: nowMillis - Math.min(...unread.map((held) => Date.parse(held.sentAt))),
		});
	}
	return { wakes, waitUntil };
});
