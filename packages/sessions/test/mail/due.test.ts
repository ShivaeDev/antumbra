import { expect, it } from "@effect/vitest";
import { dueMail, type MailReading } from "#mail/due.ts";

const QUIET = 5 * 60_000;
const NOW = 10 * 60_000;

const reading = (input: Partial<MailReading>): MailReading => ({
	atRest: true,
	nowMillis: NOW,
	quietMillis: QUIET,
	unread: [],
	...input,
});

it("priority mail is due the moment it is unread", () => {
	expect(dueMail(reading({ unread: [{ createdAtMillis: NOW, precedence: "priority" }] }))).toEqual({
		count: 1,
		precedence: "priority",
	});
});

it("routine mail alone waits out the quiet window", () => {
	const fresh = [{ createdAtMillis: NOW - QUIET + 1, precedence: "routine" as const }];
	expect(dueMail(reading({ unread: fresh }))).toBeUndefined();
	expect(dueMail(reading({ unread: [{ createdAtMillis: NOW - QUIET, precedence: "routine" }] }))).toEqual({
		count: 1,
		precedence: "routine",
	});
});

it("one wake carries the whole batch under its most urgent precedence", () => {
	expect(
		dueMail(
			reading({
				unread: [
					{ createdAtMillis: NOW, precedence: "routine" },
					{ createdAtMillis: NOW, precedence: "flash" },
					{ createdAtMillis: NOW, precedence: "priority" },
				],
			}),
		),
	).toEqual({ count: 3, precedence: "flash" });
});

it("an agent taking a turn is never due", () => {
	expect(dueMail(reading({ atRest: false, unread: [{ createdAtMillis: NOW, precedence: "flash" }] }))).toBeUndefined();
});

it("an agent at rest with nothing unread is never due", () => {
	expect(dueMail(reading({}))).toBeUndefined();
});
