import { Effect } from "effect";
import { RulingAlreadyRuled } from "#errors.ts";
import { requireRuling } from "#read.ts";

export const requireOpen = (rulingId: string) =>
	Effect.gen(function* () {
		const row = yield* requireRuling(rulingId);
		return row.ruledAt === null ? row : yield* new RulingAlreadyRuled({ rulingId });
	});
