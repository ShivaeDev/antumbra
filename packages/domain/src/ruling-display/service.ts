import { Changes } from "@antumbra/changes";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { defineService } from "@antumbra/platform-service-definition/define-service.ts";
import { Rulings } from "@antumbra/rulings";
import { Voyages } from "@antumbra/voyages";
import { Effect } from "effect";
import { open } from "#ruling-display/open.ts";
import { standing } from "#ruling-display/standing.ts";

export const RulingDisplay = defineService({
	id: "@antumbra/domain/RulingDisplay",
	initialize: Effect.void,
	methods: () => ({ open, standing }),
	requires: [Changes, Database, Pieces, Rulings, Voyages],
});
