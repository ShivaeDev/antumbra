import { feature } from "@antumbra/platform-feature/feature.ts";
import { observe, release } from "#commands.ts";
import { capacityObserved, capacityReleased } from "#facts.ts";
import { observed, released } from "#materializers.ts";
import { providers } from "#queries.ts";
import { capacity as capacityRow } from "#rows/capacity.ts";

export const capacity = feature("capacity", {
	rows: [capacityRow],
	facts: [capacityObserved, capacityReleased],
	commands: [observe, release],
	materializers: [observed, released],
	queries: [providers],
});
