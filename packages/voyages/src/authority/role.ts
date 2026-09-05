import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import type { AuthorityIdentity } from "#authority/identity.ts";

export const roleOn = Effect.fn("VoyageAuthority.roleOn")(function* (identity: AuthorityIdentity) {
	if (Option.isNone(identity.voyageId)) {
		return "";
	}
	const db = yield* Database;
	const member = yield* db.VoyageAgent.where({ agentId: identity.agentId, voyageId: identity.voyageId.value }).first();
	return Option.match(member, { onNone: () => "", onSome: (row) => row.role });
});
