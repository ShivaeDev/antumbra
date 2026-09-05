import { Effect, Option } from "effect";
import type { RulingParking } from "#model.ts";
import { invalidRulingValue } from "#stored.ts";
import type { StoredRuling } from "#stored-rows.ts";

export const storedParking = (row: StoredRuling) =>
	Effect.gen(function* () {
		if (row.parkedAt === null && row.parkedNote === null) {
			return Option.none<RulingParking>();
		}
		if (row.parkedAt === null || row.parkedNote === null) {
			return yield* invalidRulingValue("parking", row.id, row);
		}
		return Option.some<RulingParking>({ at: row.parkedAt, note: row.parkedNote });
	});
