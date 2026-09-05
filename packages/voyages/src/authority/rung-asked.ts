import { Effect, Option } from "effect";
import { isVoyageCaptainIdentity } from "#authority/captain.ts";
import { isFlagshipCaptain } from "#authority/flagship-captain.ts";
import type { AuthorityIdentity } from "#authority/identity.ts";
import { roleOn } from "#authority/role.ts";

export const rungAsked = Effect.fn("VoyageAuthority.rungAsked")(function* (identity: AuthorityIdentity) {
	const role = yield* roleOn(identity);
	if (yield* isFlagshipCaptain(role, identity)) {
		return "admiral";
	}
	if (isVoyageCaptainIdentity(role, identity)) {
		return "flagship";
	}
	return Option.isSome(identity.voyageId) ? "captain" : "admiral";
});
