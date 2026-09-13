import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { COUNTS, FLEET } from "@antumbra/domain-settings/ids.ts";
import { count } from "@antumbra/domain-settings/rows/count.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Clock, Effect, Schema } from "effect";
import { MessageId } from "#ids.ts";
import { dueMail, MailBatch, quietEnd } from "#queries/due-mail.ts";
import { message } from "#rows/message.ts";

export const DueWake = Schema.Struct({
	agentId: agent.fields.id,
	sessionId: session.fields.id,
	batch: MailBatch,
	unreadIds: Schema.Array(MessageId),
	waitedMillis: Schema.Number,
});
export type DueWake = typeof DueWake.Type;

const DueWakes = Schema.Struct({ wakes: Schema.Array(DueWake), waitUntil: Schema.NullOr(Schema.Number) });

export const dueWakes = query("dueWakes", {
	input: {},
	output: DueWakes,
	reads: [message, agent, session, count],
	run: Effect.fn("mail.dueWakes")(function* (_input, rows) {
		const settings = yield* rows.count.where({ scope: FLEET });
		const quietMillis = (settings.find((value) => value.key === "routineMailMinutes")?.count ?? COUNTS.routineMailMinutes.fallback) * 60_000;
		const nowMillis = yield* Clock.currentTimeMillis;
		const alive = new Map((yield* rows.agent.where({ status: "alive" })).map((value) => [String(value.id), value.id]));
		const resting = yield* rows.session.where({ status: "open", executionStatus: "idle" });
		const wakes: DueWake[] = [];
		let waitUntil: number | null = null;
		for (const root of resting) {
			if (root.parentSessionId !== null) continue;
			const ownerId = alive.get(root.agentId);
			if (ownerId === undefined) continue;
			const unread = (yield* rows.message.where({ toAgentId: root.agentId })).filter((held) => held.readAt === null);
			const batch = dueMail(unread, nowMillis, quietMillis);
			if (batch === undefined) {
				const next = quietEnd(unread, quietMillis);
				if (next !== undefined && (waitUntil === null || next < waitUntil)) waitUntil = next;
				continue;
			}
			wakes.push({
				agentId: ownerId,
				sessionId: root.id,
				batch,
				unreadIds: unread.map((held) => held.id),
				waitedMillis: nowMillis - Math.min(...unread.map((held) => Date.parse(held.sentAt))),
			});
		}
		return { wakes, waitUntil };
	}),
});
