import { Mail, type MailInput, MailNotAddressed, type MailRow, type MailService } from "@antumbra/boards";
import type { mail } from "@antumbra/domain-mail/feature.ts";
import { MessageId } from "@antumbra/domain-mail/ids.ts";
import type { message } from "@antumbra/domain-mail/rows/message.ts";
import type { RowValue } from "@antumbra/platform-feature/row.ts";
import type { Api } from "@antumbra/platform-rpc/client.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Layer } from "effect";
import { once, ServerReach } from "#adapters/server-reach.ts";

export interface MailRefusal {
	readonly _tag: string;
	readonly id?: string;
}

type Reach<Failure> = Api<readonly [typeof mail], Failure>;

const NAMELESS = "";

const mailOf = (stored: RowValue<typeof message>): MailRow => ({
	authorAgentId: stored.authorAgentId,
	body: stored.body,
	deliveredAt: stored.deliveredAt === null ? null : new Date(stored.deliveredAt),
	id: stored.id,
	precedence: stored.precedence,
	readAt: stored.readAt === null ? null : new Date(stored.readAt),
	sentAt: new Date(stored.sentAt),
	toAgentId: stored.toAgentId,
});

const strayed =
	(agentId: string) =>
	(failure: MailRefusal): Effect.Effect<never, MailNotAddressed> =>
		failure._tag === "NotAddressed" ? Effect.fail(new MailNotAddressed({ agentId, messageId: failure.id ?? NAMELESS })) : Effect.die(failure);

export const mailOver = <Failure extends MailRefusal>(reach: Reach<Failure>): MailService => ({
	mailbox: (agentId: string) => Effect.map(once(reach.mail.mailbox({ agentId })), (stored) => stored.map(mailOf)),
	markDelivered: (agentId: string, messageIds: ReadonlyArray<string>) =>
		reach.mail
			.markDelivered({ agentId, ids: messageIds.map((messageId) => MessageId.make(messageId)) })
			.pipe(Effect.catch(strayed(agentId)), Effect.asVoid),
	markRead: (agentId: string, messageIds: ReadonlyArray<string>) =>
		reach.mail
			.markRead({ agentId, ids: messageIds.map((messageId) => MessageId.make(messageId)) })
			.pipe(Effect.catch(strayed(agentId)), Effect.asVoid),
	send: (input: MailInput) =>
		reach.mail
			.send({
				authorAgentId: input.authorAgentId,
				body: input.body,
				precedence: input.precedence,
				requestId: Id.Request.make(input.requestId),
				toAgentId: input.toAgentId,
			})
			.pipe(Effect.orDie, Effect.asVoid),
	unread: (agentId: string) => Effect.map(once(reach.mail.unread({ agentId })), (stored) => stored.map(mailOf)),
});

export const MailOverRpc: Layer.Layer<Mail, never, ServerReach> = Layer.effect(Mail)(Effect.map(ServerReach, mailOver));
