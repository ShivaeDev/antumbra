import { askedByAntumbra } from "#v1/migrations/boards-smoothing-requested.ts";
import { observedFeedback } from "#v1/migrations/changes-change-observed.ts";
import { pricedTurns } from "#v1/migrations/sessions-provider-event.ts";
import { gatedOperations } from "#v1/migrations/sessions-retry.ts";
import { foldedHolds, signingDropped } from "#v1/migrations/settings-flag-set.ts";
export const migrations = [
	{ feature: "sessions", ...pricedTurns },
	{ feature: "sessions", ...gatedOperations },
	{ feature: "boards", ...askedByAntumbra },
	{ feature: "settings", ...foldedHolds },
	{ feature: "settings", ...signingDropped },
	{ feature: "changes", ...observedFeedback },
].toSorted((a, b) => a.feature.localeCompare(b.feature) || a.number - b.number);
