import { Effect, Option } from "effect";
import { isFlagshipCaptain } from "#authority/flagship-captain.ts";
import { roleOn } from "#authority/role.ts";
import type { SessionIdentity } from "#tool-identity.ts";
import { isVoyageCaptainIdentity } from "#voyage-captain.ts";

export const rungAsked = Effect.fn("VoyageAuthority.rungAsked")(function* (identity: SessionIdentity) {
	const role = yield* roleOn(identity);
	if (yield* isFlagshipCaptain(role, identity)) {
		return "admiral";
	}
	if (isVoyageCaptainIdentity(role, identity)) {
		return "flagship";
	}
	return Option.isSome(identity.voyageId) ? "captain" : "admiral";
});
