import { feature } from "@antumbra/feature/feature.ts";
import { setCount } from "#commands/set-count.ts";
import { setFlag } from "#commands/set-flag.ts";
import { countSet } from "#facts/count-set.ts";
import { flagSet } from "#facts/flag-set.ts";
import { countSetMaterializer } from "#materializers/count-set.ts";
import { flagSetMaterializer } from "#materializers/flag-set.ts";
import { counts } from "#queries/counts.ts";
import { flags } from "#queries/flags.ts";
import { count } from "#rows/count.ts";
import { flag } from "#rows/flag.ts";

export const settings = feature("settings", {
	rows: [flag, count],
	facts: [flagSet, countSet],
	commands: [setFlag, setCount],
	materializers: [flagSetMaterializer, countSetMaterializer],
	queries: [flags, counts],
});
