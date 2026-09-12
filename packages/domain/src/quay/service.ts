import { Changes } from "@antumbra/changes";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { defineService } from "@antumbra/platform-service-definition/define-service.ts";
import { Repos } from "@antumbra/repos";
import { Voyages } from "@antumbra/voyages";
import { Effect } from "effect";
import { read } from "#quay/read.ts";

export const Quay = defineService({
	id: "@antumbra/domain/Quay",
	initialize: Effect.void,
	methods: () => ({ read }),
	requires: [Changes, Database, Pieces, Repos, Voyages],
});
