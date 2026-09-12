import { backendCatalog } from "@antumbra/domain-backends/rows/backend-catalog.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { observe } from "#commands/observe.ts";
import { release } from "#commands/release.ts";
import { capacityObserved } from "#facts/observed.ts";
import { capacityReleased } from "#facts/released.ts";
import { observed } from "#materializers/observed.ts";
import { released } from "#materializers/released.ts";
import { providers } from "#queries/providers.ts";
import { capacity as capacityRow } from "#rows/capacity.ts";

export const capacity = feature("capacity", {
	rows: [capacityRow, backendCatalog],
	facts: [capacityObserved, capacityReleased],
	commands: [observe, release],
	materializers: [observed, released],
	queries: [providers],
});
