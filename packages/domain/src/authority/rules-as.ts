import { Effect } from "effect";
import { isFlagshipCaptain } from "#authority/flagship-captain.ts";
import { roleOn } from "#authority/role.ts";
import type { SessionIdentity } from "#tool-identity.ts";

export const rulesAs = Effect.fn("VoyageAuthority.rulesAs")(function* (identity: SessionIdentity) {
	return (yield* isFlagshipCaptain(yield* roleOn(identity), identity)) ? "flagship" : "captain";
});
