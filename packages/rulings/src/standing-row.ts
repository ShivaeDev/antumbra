import { Effect } from "effect";
import { RulingAlreadySuperseded, RulingAlreadyWithdrawn, RulingNotRuled } from "#errors.ts";
import { requireRuling } from "#read.ts";

// why: both acts that retire a ruling ask the same question first — does this
// ruling still stand? An open question binds nobody yet, and one that has
// already been taken over or withdrawn has had its say ended once.
export const requireStanding = (rulingId: string) =>
	Effect.gen(function* () {
		const row = yield* requireRuling(rulingId);
		if (row.ruledAt === null) {
			return yield* new RulingNotRuled({ rulingId });
		}
		if (row.supersededById !== null) {
			return yield* new RulingAlreadySuperseded({
				byRulingId: row.supersededById,
				rulingId,
			});
		}
		if (row.withdrawnAt !== null) {
			return yield* new RulingAlreadyWithdrawn({ rulingId });
		}
		return row;
	});
