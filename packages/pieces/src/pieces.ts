import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { Voyages } from "@antumbra/voyages";
import { Effect } from "effect";
import { charter } from "#charter.ts";
import { landVerdict } from "#land-verdict.ts";
import { launch } from "#launch.ts";
import { park } from "#park.ts";
import { verifyPieceExists } from "#rows.ts";
import { setDependencies } from "#set-dependencies.ts";
import { verdicts } from "#verdicts.ts";
import { memberPieceIds } from "#voyage-membership.ts";

const requirements = [Database, DomainFeeds, Voyages] as const;

export const Pieces = defineService({
	id: "@antumbra/pieces/Pieces",
	initialize: Effect.void,
	methods: () => ({
		charter,
		landVerdict,
		launch,
		membersOfVoyage: memberPieceIds,
		park,
		setDependencies,
		verifyExists: verifyPieceExists,
		verdicts,
	}),
	requires: requirements,
});

export const PiecesLive = Pieces.layer;
