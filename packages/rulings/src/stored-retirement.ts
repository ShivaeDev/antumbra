import { decodeStoredRulingAuthority } from "@antumbra/vocabulary/ruling";
import { Effect, Option } from "effect";
import type { RulingSupersession, RulingWithdrawal } from "#retirement.ts";
import { invalidRulingValue } from "#stored.ts";
import type { StoredRuling } from "#stored-rows.ts";

// why: supersession is one appended fact with its provenance; a row naming
// the ruling that took over without who did it or when is corruption.
export const storedSupersession = (row: StoredRuling) =>
	Effect.gen(function* () {
		const parts = [row.supersededAt, row.supersededBy, row.supersededById];
		if (parts.every((part) => part === null)) {
			return Option.none<RulingSupersession>();
		}
		if (
			row.supersededAt === null ||
			row.supersededBy === null ||
			row.supersededById === null
		) {
			return yield* invalidRulingValue("supersession", row.id, row);
		}
		return Option.some<RulingSupersession>({
			at: row.supersededAt,
			by: yield* Effect.fromResult(
				decodeStoredRulingAuthority(row.id, row.supersededBy),
			),
			byRulingId: row.supersededById,
		});
	});

// why: a withdrawal names no successor, so its words stand where a supersession
// puts the ruling that took over; a row holding part of one is corruption for
// the same reason a half-written supersession is.
export const storedWithdrawal = (row: StoredRuling) =>
	Effect.gen(function* () {
		const parts = [row.withdrawnAt, row.withdrawnBy, row.withdrawnNote];
		if (parts.every((part) => part === null)) {
			return Option.none<RulingWithdrawal>();
		}
		if (
			row.withdrawnAt === null ||
			row.withdrawnBy === null ||
			row.withdrawnNote === null
		) {
			return yield* invalidRulingValue("withdrawal", row.id, row);
		}
		return Option.some<RulingWithdrawal>({
			at: row.withdrawnAt,
			by: yield* Effect.fromResult(
				decodeStoredRulingAuthority(row.id, row.withdrawnBy),
			),
			note: row.withdrawnNote,
		});
	});
