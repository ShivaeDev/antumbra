import { landArtifact } from "@antumbra/app-testing/artifacts.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
export const voyageId = VoyageId.make("voyage:reef");
export const pieceId = PieceId.make("piece:reef");
export const opening = {
	requestId: Id.Request.make(voyageId),
	captainBackend: null,
	captainEffort: null,
	captainModel: null,
	crewBackend: null,
	crewEffort: null,
	crewModel: null,
	kind: "voyage",
	name: "Reef",
	northStar: "Find safe passage",
	context: "Sound the reef",
} as const;
export const chartering = {
	requestId: Id.Request.make(pieceId),
	voyageId,
	title: "Sound",
	charter: "Sound the reef",
	expectation: "A chart",
	role: "hand",
	dependsOn: [],
};
export const landing = (name: string, path: string, supersedesArtifactId: Parameters<typeof landArtifact>[0]["supersedesArtifactId"] = null) =>
	landArtifact({
		requestId: Id.Request.make(name),
		pieceId,
		authorAgentId: "agent:cartographer",
		path,
		title: name,
		supersedesArtifactId,
	});
