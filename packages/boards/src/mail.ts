import { Context, Data, type Effect } from "effect";

export type MailPrecedence = "flash" | "priority" | "routine";

export class MailNotAddressed extends Data.TaggedError("MailNotAddressed")<{
	readonly agentId: string;
	readonly messageId: string;
}> {
	override get message(): string {
		return `${this.messageId} is not mail addressed to ${this.agentId}`;
	}
}

export interface MailRow {
	readonly authorAgentId: string | null;
	readonly body: string;
	readonly deliveredAt: Date | null;
	readonly id: string;
	readonly precedence: MailPrecedence;
	readonly readAt: Date | null;
	readonly sentAt: Date;
	readonly toAgentId: string;
}

export interface MailInput {
	readonly authorAgentId: string | null;
	readonly body: string;
	readonly precedence: MailPrecedence;
	readonly requestId: string;
	readonly toAgentId: string;
}

export interface MailService {
	readonly mailbox: (agentId: string) => Effect.Effect<ReadonlyArray<MailRow>>;
	readonly markDelivered: (agentId: string, messageIds: ReadonlyArray<string>) => Effect.Effect<void, MailNotAddressed>;
	readonly markRead: (agentId: string, messageIds: ReadonlyArray<string>) => Effect.Effect<void, MailNotAddressed>;
	readonly send: (input: MailInput) => Effect.Effect<void>;
	readonly unread: (agentId: string) => Effect.Effect<ReadonlyArray<MailRow>>;
}

export class Mail extends Context.Service<Mail, MailService>()("@antumbra/boards/Mail") {}
