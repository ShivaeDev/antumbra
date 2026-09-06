import { Changes } from "@antumbra/changes";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Repos } from "@antumbra/repos";
import { Rulings } from "@antumbra/rulings";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { RoleSettings } from "@antumbra/settings";
import { Effect } from "effect";
import { read } from "#voyage/detail/read.ts";

export const VoyageDetails = defineService({
	id: "@antumbra/domain/VoyageDetails",
	initialize: Effect.void,
	methods: () => ({ read }),
	requires: [Changes, Database, Pieces, Repos, RoleSettings, Rulings],
});
