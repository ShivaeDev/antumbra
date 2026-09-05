import { Changes } from "@antumbra/changes";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Rulings } from "@antumbra/rulings";
import { defineService } from "@antumbra/service-definition";
import { RoleSettings } from "@antumbra/settings";
import { Effect } from "effect";
import { read } from "#voyage/summaries/read.ts";

export const VoyageSummaries = defineService({
	id: "@antumbra/domain/VoyageSummaries",
	initialize: Effect.void,
	methods: () => ({ read }),
	requires: [Changes, Database, Pieces, RoleSettings, Rulings],
});
