import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";

// why: the warning is the only account a failed dispatch ever gives, so it says
// what failed and how far it got, and it says something in every case — a row
// that recorded no reason and a row that is gone are different facts, and
// neither may reach the reader as an empty container.
const GONE = {
	detail: "the Intent row is gone",
	status: "missing",
	tag: "missing",
} as const;

const NO_REASON = "the Intent recorded no reason";

export interface DispatchFailureAccount {
	readonly detail: string;
	readonly status: string;
	readonly tag: string;
}

export const dispatchFailureAccount = (
	row: Option.Option<{
		readonly detail: string | null;
		readonly status: string;
		readonly tag: string;
	}>,
): DispatchFailureAccount =>
	Option.match(row, {
		onNone: () => GONE,
		onSome: (intent) => ({
			detail: intent.detail ?? NO_REASON,
			status: intent.status,
			tag: intent.tag,
		}),
	});

export const accountOfIntent = (intentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return dispatchFailureAccount(yield* db.Intent.where({ id: intentId }).first());
	});
