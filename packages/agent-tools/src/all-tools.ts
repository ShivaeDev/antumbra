import type { ToolDefinition } from "@antumbra/plugin-api";
import { markReadSpec, readBoardSpec, readMailSpec, writeBoardSpec, writeSummarySpec } from "#boards.ts";
import { charterPieceSpec, launchPieceSpec, parkPieceSpec, readVoyageSpec, rewirePieceSpec, unparkPieceSpec } from "#captain.ts";
import { adoptChangeSpec, openChangeSpec, submitChangeSpec } from "#changes.ts";
import { landArtifactSpec, landReportSpec, removeArtifactSupersessionSpec, supersedeArtifactSpec } from "#crew.ts";
import { charterVoyagePieceSpec, hailCaptainSpec, openVoyageSpec, proclaimRulingSpec, readFleetSpec, registerRepoSpec } from "#fleet.ts";
import { readReportSpec } from "#reports.ts";
import { readRulingsSpec } from "#ruling-readings.ts";
import { passUpSpec, reclassifyRulingSpec, ruleOnSpec } from "#ruling-verdicts.ts";
import { addContextSpec, requestRulingSpec } from "#rulings.ts";

export const allToolSpecs: ReadonlyArray<ToolDefinition> = [
	addContextSpec,
	adoptChangeSpec,
	charterPieceSpec,
	charterVoyagePieceSpec,
	hailCaptainSpec,
	landArtifactSpec,
	landReportSpec,
	launchPieceSpec,
	markReadSpec,
	openChangeSpec,
	openVoyageSpec,
	parkPieceSpec,
	passUpSpec,
	proclaimRulingSpec,
	readBoardSpec,
	readFleetSpec,
	readMailSpec,
	readReportSpec,
	readRulingsSpec,
	readVoyageSpec,
	reclassifyRulingSpec,
	registerRepoSpec,
	removeArtifactSupersessionSpec,
	requestRulingSpec,
	rewirePieceSpec,
	ruleOnSpec,
	submitChangeSpec,
	supersedeArtifactSpec,
	unparkPieceSpec,
	writeBoardSpec,
	writeSummarySpec,
];
