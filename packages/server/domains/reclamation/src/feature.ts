import { feature } from "@antumbra/platform-feature/feature.ts";
import { claim } from "#commands/claim.ts";
import { held } from "#commands/held.ts";
import { plan } from "#commands/plan.ts";
import { ready } from "#commands/ready.ts";
import { reclaimed } from "#commands/reclaimed.ts";
import { berthHeld } from "#facts/berth-held.ts";
import { berthReclaimed } from "#facts/berth-reclaimed.ts";
import { mooragePlanned } from "#facts/moorage-planned.ts";
import { moorageReady } from "#facts/moorage-ready.ts";
import { resourcesClaimed } from "#facts/resources-claimed.ts";
import { berthHeldMaterializer } from "#materializers/berth-held.ts";
import { berthReclaimedMaterializer } from "#materializers/berth-reclaimed.ts";
import { mooragePlannedMaterializer } from "#materializers/moorage-planned.ts";
import { moorageReadyMaterializer } from "#materializers/moorage-ready.ts";
import { resourcesClaimedMaterializer } from "#materializers/resources-claimed.ts";
import { berths } from "#queries/berths.ts";
import { candidates } from "#queries/candidates.ts";
import { claims } from "#queries/claims.ts";
import { current } from "#queries/moorage.ts";
import { berth } from "#rows/berth.ts";
import { heldResource } from "#rows/held-resource.ts";
import { moorage } from "#rows/moorage.ts";
import { resourceOwner } from "#rows/resource-owner.ts";

export const reclamation = feature("reclamation", {
	rows: [moorage, berth, heldResource, resourceOwner],
	facts: [mooragePlanned, moorageReady, resourcesClaimed, berthReclaimed, berthHeld],
	commands: [plan, ready, claim, reclaimed, held],
	materializers: [
		mooragePlannedMaterializer,
		moorageReadyMaterializer,
		resourcesClaimedMaterializer,
		berthReclaimedMaterializer,
		berthHeldMaterializer,
	],
	queries: [berths, current, candidates, claims],
});
