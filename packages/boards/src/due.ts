import type { MailPrecedence, MailRow } from "#mail.ts";

export interface MailBatch {
	readonly count: number;
	readonly precedence: MailPrecedence;
}

export interface MailReading {
	readonly nowMillis: number;
	readonly quietMillis: number;
	readonly unread: ReadonlyArray<MailRow>;
}

const URGENCY: Record<MailPrecedence, number> = { flash: 2, priority: 1, routine: 0 };

const mostUrgent = (unread: ReadonlyArray<MailRow>): MailPrecedence | undefined =>
	unread.reduce<MailPrecedence | undefined>(
		(highest, held) => (highest === undefined || URGENCY[held.precedence] > URGENCY[highest] ? held.precedence : highest),
		undefined,
	);

const qualifies = (input: MailReading): boolean =>
	input.unread.some(
		(held) => held.deliveredAt === null && (held.precedence !== "routine" || input.nowMillis - held.sentAt.getTime() >= input.quietMillis),
	);

export const dueMail = (input: MailReading): MailBatch | undefined => {
	const precedence = mostUrgent(input.unread);
	return precedence === undefined || !qualifies(input) ? undefined : { count: input.unread.length, precedence };
};
