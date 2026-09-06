import { Database } from "@antumbra/persistence";
import { decodeStoredVoyageKind } from "@antumbra/vocabulary/voyage.ts";
import { Effect, Option } from "effect";
import { isVoyageCaptainIdentity } from "#authority/captain.ts";
import type { AuthorityIdentity } from "#authority/identity.ts";

export const isFlagshipCaptain = Effect.fn("VoyageAuthority.isFlagshipCaptain")(function* (role: string, identity: AuthorityIdentity) {
	if (!isVoyageCaptainIdentity(role, identity) || Option.isNone(identity.voyageId)) {
		return false;
	}
	const db = yield* Database;
	const voyage = yield* db.Voyage.where({ id: identity.voyageId.value }).first();
	if (Option.isNone(voyage)) {
		return false;
	}
	return (yield* Effect.fromResult(decodeStoredVoyageKind(voyage.value.id, voyage.value.kind))) === "flagship";
});
