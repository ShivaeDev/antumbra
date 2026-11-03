import { PieceHistory } from "@antumbra/server-journal/postgres/pieces/service.ts";
import { VoyageHistory } from "@antumbra/server-journal/postgres/voyages/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { charter } from "#charter.ts";
import { initialize } from "#initialize.ts";
import { landVerdict } from "#land-verdict.ts";
import { launch } from "#launch.ts";
import { observeProgress } from "#observe-progress.ts";
import { park } from "#park.ts";
import { all, byId, byVoyage, dependencies, displayByVoyage, edges, others, progress, reach, ready } from "#read.ts";
import { rewire } from "#rewire.ts";
import { unpark } from "#unpark.ts";

export const Pieces = defineService({
	id: "@antumbra/server-pieces/Pieces",
	requires: [PieceHistory, VoyageHistory],
	initialize: initialize,
	methods: (serial) => ({
		charter: charter(serial),
		launch: launch(serial),
		park: park(serial),
		unpark: unpark(serial),
		landVerdict: landVerdict(serial),
		rewire: rewire(serial),
		observeProgress: observeProgress(serial),
		all,
		byId,
		byVoyage,
		dependencies,
		displayByVoyage,
		edges,
		others,
		progress,
		reach,
		ready,
	}),
});
