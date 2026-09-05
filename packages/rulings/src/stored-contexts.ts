import { Option } from "effect";
import type { RulingContext } from "#model.ts";
import type { StoredRulingContext } from "#stored-rows.ts";

export const storedContext = (row: StoredRulingContext): RulingContext => ({
	at: row.at,
	authorAgentId: Option.fromNullOr(row.authorAgentId),
	body: row.body,
});
