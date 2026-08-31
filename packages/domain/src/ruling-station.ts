import type { RulingAuthority } from "@antumbra/vocabulary/ruling";
import { Option } from "effect";
import type { SessionIdentity } from "#tool-identity.ts";
import { isFlagshipCaptainIdentity, isVoyageCaptainIdentity } from "#voyage-captain.ts";
import { crewOf } from "#voyage-crew.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

const roleOn = (world: VoyageWorld, identity: SessionIdentity): string =>
	Option.match(identity.voyageId, {
		onNone: () => "",
		onSome: (voyageId) => crewOf(world, voyageId).find((member) => member.agentId === identity.agentId)?.role ?? "",
	});

export const rungAsked = (world: VoyageWorld, identity: SessionIdentity): RulingAuthority => {
	const role = roleOn(world, identity);
	if (isFlagshipCaptainIdentity(world, role, identity)) {
		return "admiral";
	}
	if (isVoyageCaptainIdentity(role, identity)) {
		return "flagship";
	}
	return Option.isSome(identity.voyageId) ? "captain" : "admiral";
};

export const rulesAs = (world: VoyageWorld, identity: SessionIdentity): RulingAuthority =>
	isFlagshipCaptainIdentity(world, roleOn(world, identity), identity) ? "flagship" : "captain";
