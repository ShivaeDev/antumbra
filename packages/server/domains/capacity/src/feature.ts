import { backendCatalog } from "@antumbra/domain-backends/rows/backend-catalog.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { observe, release } from "#commands.ts";
import { capacityObserved, capacityReleased } from "#facts.ts";
import { observed, released } from "#materializers.ts";
import { providers } from "#queries/providers.ts";
import { capacity as capacityRow } from "#rows/capacity.ts";

export const capacity = feature("capacity", {
	rows: [capacityRow, backendCatalog],
	facts: [capacityObserved, capacityReleased],
	commands: [observe, release],
	materializers: [observed, released],
	queries: [providers],
});
