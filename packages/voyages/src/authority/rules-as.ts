import { Effect } from "effect";
import { isFlagshipCaptain } from "#authority/flagship-captain.ts";
import type { AuthorityIdentity } from "#authority/identity.ts";
import { roleOn } from "#authority/role.ts";

export const rulesAs = Effect.fn("VoyageAuthority.rulesAs")(function* (identity: AuthorityIdentity) {
	return (yield* isFlagshipCaptain(yield* roleOn(identity), identity)) ? "flagship" : "captain";
});
