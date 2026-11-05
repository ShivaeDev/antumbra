import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import { readings as agents } from "#readings/agents.ts";
import { readings as boards } from "#readings/boards.ts";
import { readings as changes } from "#readings/changes.ts";
import { readings as pieces } from "#readings/pieces.ts";
import { readings as reports } from "#readings/reports.ts";
import { readings as repos } from "#readings/repos.ts";
import { readings as roleSettings } from "#readings/roleSettings.ts";
import { readings as sessions } from "#readings/sessions.ts";
import type { NativeRead } from "#readings/types.ts";
import { readings as voyages } from "#readings/voyages.ts";
export const readings: ReadonlyMap<QueryShape, NativeRead> = new Map([
	...agents,
	...boards,
	...changes,
	...pieces,
	...reports,
	...repos,
	...roleSettings,
	...sessions,
	...voyages,
]);
