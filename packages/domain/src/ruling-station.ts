import type { RulingAuthority } from "@antumbra/vocabulary/ruling";
import { Option } from "effect";
import type { SessionIdentity } from "#tool-identity.ts";
import { isFlagshipCaptainIdentity, isVoyageCaptainIdentity } from "#voyage-captain.ts";
import { crewOf } from "#voyage-crew.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

// why: the station an agent asks from is durable crew truth, not something the
// caller may claim: the role is the one written when the agent was assigned to
// the voyage, read back off the same world every other reading of a captain
// reads. An agent that answers to no voyage has no crew row and no role.
const roleOn = (world: VoyageWorld, identity: SessionIdentity): string =>
	Option.match(identity.voyageId, {
		onNone: () => "",
		onSome: (voyageId) => crewOf(world, voyageId).find((member) => member.agentId === identity.agentId)?.role ?? "",
	});

// why: the rung a request waits on is one step above where it was asked: a
// crew member's waits on its voyage's captain, a captain's on the flagship, the
// flagship captain's on the admiral. An agent on no voyage has no captain above
// it, so its question is the admiral's from the start.
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

// why: a captain answers as the rung it holds, and the flagship's captain holds
// the fleet's own rung rather than a ship's. The word is read off the record so
// a voyage that stopped being the flagship stops conferring the station.
export const rulesAs = (world: VoyageWorld, identity: SessionIdentity): RulingAuthority =>
	isFlagshipCaptainIdentity(world, roleOn(world, identity), identity) ? "flagship" : "captain";
