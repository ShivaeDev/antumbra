import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { ReportId } from "#ids.ts";

export const reef = VoyageId.make("voyage:reef");
export const soundings = PieceId.make("piece:soundings");
export const reportId = ReportId.make("report:reef");
export const opening = {
	captainBackend: null,
	captainEffort: null,
	captainModel: null,
	context: "the reef is uncharted",
	crewBackend: null,
	crewEffort: null,
	crewModel: null,
	kind: "voyage",
	name: "Chart the reef",
	northStar: "every shoal is known",
	requestId: Id.Request.make(reef),
} as const;
export const chartering = {
	charter: "sound the reef",
	dependsOn: [],
	expectation: "soundings land",
	requestId: Id.Request.make(soundings),
	role: "hand",
	title: "Soundings",
	voyageId: reef,
};
export const landing = {
	authorAgentId: "agent-surveyor",
	body: "The eastern shoal is steeper than charted.",
	pieceId: soundings,
	requestId: Id.Request.make(reportId),
	title: "Reef soundings",
};
