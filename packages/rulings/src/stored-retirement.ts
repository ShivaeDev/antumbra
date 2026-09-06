import { decodeStoredRulingAuthority } from "@antumbra/vocabulary/ruling.ts";
import { Effect, Option } from "effect";
import type { RulingSupersession, RulingWithdrawal } from "#retirement.ts";
import { invalidRulingValue } from "#stored.ts";
import type { StoredRuling } from "#stored-rows.ts";

export const storedSupersession = Effect.fnUntraced(function* (row: StoredRuling) {
	const parts = [row.supersededAt, row.supersededBy, row.supersededById];
	if (parts.every((part) => part === null)) {
		return Option.none<RulingSupersession>();
	}
	if (row.supersededAt === null || row.supersededBy === null || row.supersededById === null) {
		return yield* invalidRulingValue("supersession", row.id, row);
	}
	return Option.some<RulingSupersession>({
		at: row.supersededAt,
		by: yield* Effect.fromResult(decodeStoredRulingAuthority(row.id, row.supersededBy)),
		byRulingId: row.supersededById,
	});
});

export const storedWithdrawal = Effect.fnUntraced(function* (row: StoredRuling) {
	const parts = [row.withdrawnAt, row.withdrawnBy, row.withdrawnNote];
	if (parts.every((part) => part === null)) {
		return Option.none<RulingWithdrawal>();
	}
	if (row.withdrawnAt === null || row.withdrawnBy === null || row.withdrawnNote === null) {
		return yield* invalidRulingValue("withdrawal", row.id, row);
	}
	return Option.some<RulingWithdrawal>({
		at: row.withdrawnAt,
		by: yield* Effect.fromResult(decodeStoredRulingAuthority(row.id, row.withdrawnBy)),
		note: row.withdrawnNote,
	});
});
