import { Changes } from "@antumbra/changes";
import { Database } from "@antumbra/persistence";
import { Repos } from "@antumbra/repos";
import { Rulings } from "@antumbra/rulings";
import { defineService } from "@antumbra/service-definition";
import { type Context, Effect } from "effect";
import { read } from "#voyage-world/read.ts";

export const VoyageWorldSource = defineService({
	id: "@antumbra/domain/VoyageWorldSource",
	initialize: Effect.void,
	methods: () => ({ read }),
	requires: [Changes, Database, Repos, Rulings],
});

export type VoyageWorldSource = Context.Service.Identifier<typeof VoyageWorldSource>;
