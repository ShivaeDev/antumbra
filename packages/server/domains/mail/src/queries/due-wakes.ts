import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { COUNTS, FLEET } from "@antumbra/domain-settings/ids.ts";
import { count } from "@antumbra/domain-settings/rows/count.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Clock, Effect, Schema } from "effect";
import { MessageId } from "#ids.ts";
import { message } from "#rows/message.ts";
import { dueMail, MailBatch } from "#wakes/due.ts";

export const DueWake = Schema.Struct({
	agentId: agent.fields.id,
	sessionId: session.fields.id,
	batch: MailBatch,
	unreadIds: Schema.Array(MessageId),
	waitedMillis: Schema.Number,
});
export type DueWake = typeof DueWake.Type;

export const dueWakes = query("dueWakes", {
	input: {},
	output: Schema.Array(DueWake),
	reads: [message, agent, session, count],
	run: Effect.fn("mail.dueWakes")(function* (_input, rows) {
		const settings = yield* rows.count.where({ scope: FLEET });
		const quietMillis = (settings.find((value) => value.key === "routineMailMinutes")?.count ?? COUNTS.routineMailMinutes.fallback) * 60_000;
		const nowMillis = yield* Clock.currentTimeMillis;
		const alive = new Map((yield* rows.agent.where({ status: "alive" })).map((value) => [String(value.id), value.id]));
		const resting = yield* rows.session.where({ status: "open", parentSessionId: null, executionStatus: "idle" });
		const due: DueWake[] = [];
		for (const root of resting) {
			const ownerId = alive.get(root.agentId);
			if (ownerId === undefined) continue;
			const unread = (yield* rows.message.where({ toAgentId: root.agentId })).filter((held) => held.readAt === null);
			const batch = dueMail(unread, nowMillis, quietMillis);
			if (batch === undefined) continue;
			due.push({
				agentId: ownerId,
				sessionId: root.id,
				batch,
				unreadIds: unread.map((held) => held.id),
				waitedMillis: nowMillis - Math.min(...unread.map((held) => Date.parse(held.sentAt))),
			});
		}
		return due;
	}),
});
