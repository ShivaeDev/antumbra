import { Effect, Option } from "effect";
import { isVoyageCaptainIdentity } from "#authority/captain.ts";
import type { AuthorityIdentity } from "#authority/identity.ts";
import { Voyages } from "#service.ts";

export const isFlagshipCaptain = Effect.fn("VoyageAuthority.isFlagshipCaptain")(function* (role: string, identity: AuthorityIdentity) {
	if (!isVoyageCaptainIdentity(role, identity) || Option.isNone(identity.voyageId)) {
		return false;
	}
	const voyages = yield* Voyages;
	const voyage = yield* voyages.byId(identity.voyageId.value);
	return Option.isSome(voyage) && voyage.value.kind === "flagship";
});
