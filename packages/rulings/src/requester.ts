import { decodeStoredRulingAuthority, StoredRulingValueInvalid } from "@antumbra/vocabulary/ruling";
import { Effect } from "effect";
import type { RulingRequester } from "#model.ts";
import type { StoredRuling } from "#stored-rows.ts";

export const requesterColumns = (requester: RulingRequester) => ({
	requesterAgentId: requester.kind === "agent" ? requester.agentId : null,
	requesterAuthority: requester.kind === "authority" ? requester.by : null,
});

export const storedRequester = (row: StoredRuling) =>
	Effect.gen(function* () {
		const invalid = new StoredRulingValueInvalid({
			field: "requester",
			rulingId: row.id,
			value: row,
		});
		if (row.requesterAgentId !== null) {
			if (row.requesterAuthority !== null) {
				return yield* invalid;
			}
			return { agentId: row.requesterAgentId, kind: "agent" } as const;
		}
		if (row.requesterAuthority === null) {
			return yield* invalid;
		}
		return {
			by: yield* Effect.fromResult(decodeStoredRulingAuthority(row.id, row.requesterAuthority)),
			kind: "authority",
		} as const;
	});
