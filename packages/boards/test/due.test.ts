import { dueMail, type MailPrecedence, type UnreadMailRow } from "@antumbra/boards";
import { describe, expect, it } from "@effect/vitest";

const QUIET = 300_000;
const NOW = 1_000_000;

interface Waiting {
	readonly delivered?: boolean;
	readonly precedence: MailPrecedence;
	readonly waitedMillis?: number;
}

const waiting = (mail: Waiting, index: number): UnreadMailRow => ({
	authorAgentId: null,
	body: "the eastern approach is closed",
	coversFrom: null,
	coversTo: null,
	createdAt: new Date(NOW - (mail.waitedMillis ?? 0)),
	delivered: mail.delivered ?? false,
	id: `entry-${index}`,
	kind: "mail",
	level: null,
	precedence: mail.precedence,
	register: "smooth",
	seq: index + 1,
	sourceRef: `test:mail-${index}`,
});

const due = (...mail: ReadonlyArray<Waiting>) => dueMail({ nowMillis: NOW, quietMillis: QUIET, unread: mail.map(waiting) });

describe("mail comes due", () => {
	it("as soon as priority or flash arrives", () => {
		expect(due({ precedence: "priority" })).toEqual({ count: 1, precedence: "priority" });
		expect(due({ precedence: "flash" })).toEqual({ count: 1, precedence: "flash" });
	});

	it("only once routine has waited out the quiet window", () => {
		expect(due({ precedence: "routine", waitedMillis: QUIET - 1 })).toBeUndefined();
		expect(due({ precedence: "routine", waitedMillis: QUIET })).toEqual({ count: 1, precedence: "routine" });
	});

	it("counting every unread mail and naming the most urgent", () => {
		expect(due({ precedence: "routine" }, { precedence: "priority" }, { precedence: "routine" })).toEqual({ count: 3, precedence: "priority" });
	});

	it("never with an empty mailbox", () => {
		expect(due()).toBeUndefined();
	});
});

describe("mail already delivered", () => {
	it("does not come due a second time, however long it stays unread", () => {
		expect(due({ delivered: true, precedence: "flash", waitedMillis: QUIET * 10 })).toBeUndefined();
	});

	it("comes due again the moment something new arrives", () => {
		expect(due({ delivered: true, precedence: "priority" }, { precedence: "priority" })).toEqual({ count: 2, precedence: "priority" });
	});

	it("leaves routine that arrived since to wait out its own window", () => {
		expect(due({ delivered: true, precedence: "priority" }, { precedence: "routine" })).toBeUndefined();
	});
});
