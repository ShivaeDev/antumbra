import type { MailPrecedence } from "@antumbra/boards";

export interface UnreadMail {
	readonly createdAtMillis: number;
	readonly precedence: MailPrecedence;
}

export interface MailBatch {
	readonly count: number;
	readonly precedence: MailPrecedence;
}

export interface MailReading {
	readonly atRest: boolean;
	readonly nowMillis: number;
	readonly quietMillis: number;
	readonly unread: ReadonlyArray<UnreadMail>;
}

const URGENCY: Record<MailPrecedence, number> = { flash: 2, priority: 1, routine: 0 };

const mostUrgent = (unread: ReadonlyArray<UnreadMail>): MailPrecedence | undefined =>
	unread.reduce<MailPrecedence | undefined>(
		(highest, mail) => (highest === undefined || URGENCY[mail.precedence] > URGENCY[highest] ? mail.precedence : highest),
		undefined,
	);

const routineIsOldEnough = (input: MailReading): boolean =>
	input.unread.some((mail) => mail.precedence === "routine" && input.nowMillis - mail.createdAtMillis >= input.quietMillis);

export const dueMail = (input: MailReading): MailBatch | undefined => {
	const precedence = mostUrgent(input.unread);
	if (!input.atRest || precedence === undefined) {
		return undefined;
	}
	if (precedence === "routine" && !routineIsOldEnough(input)) {
		return undefined;
	}
	return { count: input.unread.length, precedence };
};
