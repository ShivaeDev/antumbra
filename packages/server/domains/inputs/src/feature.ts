import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { inputDeliveryChanged } from "#facts/delivery.ts";
import { inputRecorded } from "#facts/recorded.ts";
import { changed } from "#materializers/delivery.ts";
import { recorded } from "#materializers/recorded.ts";
import { pending } from "#queries/pending.ts";
import { reading } from "#queries/reading.ts";
import { sessionInput } from "#rows/input.ts";
export const inputs = feature("inputs", {
	rows: [sessionInput, session],
	facts: [inputRecorded, inputDeliveryChanged],
	commands: [],
	materializers: [recorded, changed],
	queries: [reading, pending],
});
