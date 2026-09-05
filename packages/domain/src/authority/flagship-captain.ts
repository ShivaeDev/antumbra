import { Database } from "@antumbra/persistence";
import { decodeStoredVoyageKind } from "@antumbra/vocabulary/voyage";
import { Effect, Option } from "effect";
import type { SessionIdentity } from "#tool-identity.ts";
import { isVoyageCaptainIdentity } from "#voyage-captain.ts";

export const isFlagshipCaptain = Effect.fn("VoyageAuthority.isFlagshipCaptain")(function* (role: string, identity: SessionIdentity) {
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
