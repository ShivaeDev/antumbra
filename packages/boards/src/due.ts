import type { MailPrecedence, UnreadMailRow } from "#model.ts";

export interface MailBatch {
	readonly count: number;
	readonly precedence: MailPrecedence;
}

export interface MailReading {
	readonly nowMillis: number;
	readonly quietMillis: number;
	readonly unread: ReadonlyArray<UnreadMailRow>;
}

const URGENCY: Record<MailPrecedence, number> = { flash: 2, priority: 1, routine: 0 };

const mostUrgent = (unread: ReadonlyArray<UnreadMailRow>): MailPrecedence | undefined =>
	unread.reduce<MailPrecedence | undefined>(
		(highest, entry) => (highest === undefined || URGENCY[entry.precedence] > URGENCY[highest] ? entry.precedence : highest),
		undefined,
	);

const qualifies = (input: MailReading): boolean =>
	input.unread.some(
		(entry) => !entry.delivered && (entry.precedence !== "routine" || input.nowMillis - entry.createdAt.getTime() >= input.quietMillis),
	);

export const dueMail = (input: MailReading): MailBatch | undefined => {
	const precedence = mostUrgent(input.unread);
	return precedence === undefined || !qualifies(input) ? undefined : { count: input.unread.length, precedence };
};
