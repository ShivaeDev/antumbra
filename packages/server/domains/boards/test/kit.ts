import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { pieceBoard, voyageBoard } from "#ids.ts";

const REEF = Id.Request.make("voyage:reef");

const SOUNDINGS = Id.Request.make("piece:soundings");

export const reef = VoyageId.make(REEF);

export const soundings = PieceId.make(SOUNDINGS);

export const reefBoard = voyageBoard(reef);

export const soundingsBoard = pieceBoard(soundings);

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
	requestId: REEF,
} as const;

export const chartering = {
	charter: "sound the eastern shoal",
	dependsOn: [],
	expectation: "the soundings are landed",
	requestId: SOUNDINGS,
	role: "hand",
	title: "Soundings",
	voyageId: reef,
} as const;

export const noting = (name: string, body: string, board = reefBoard) => ({
	author: "agent-hand",
	board,
	body,
	register: "rough" as const,
	requestId: Id.Request.make(`entry:${name}`),
});
