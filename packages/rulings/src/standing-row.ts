import { Effect } from "effect";
import { RulingAlreadySuperseded, RulingAlreadyWithdrawn, RulingNotRuled } from "#errors.ts";
import { requireRuling } from "#read.ts";

export const requireStanding = Effect.fnUntraced(function* (rulingId: string) {
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
