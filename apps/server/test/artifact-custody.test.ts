import { applicationStory } from "@antumbra/app-testing/application-story.ts";
import { artifactCustody } from "@antumbra/app-testing/artifact-custody.ts";
import { artifactAuthor, prepareArtifactSource } from "@antumbra/app-testing/artifact-source.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { ArtifactId } from "@antumbra/platform-vocabulary/artifacts-ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";
import { landArtifact } from "#adapters/artifacts/acts/land.ts";
import { readArtifact } from "#adapters/artifacts/acts/read.ts";

applicationStory.it("artifact storage keeps published bytes after their source is removed", [artifactCustody], function* (app) {
	yield* prepareArtifactSource({ seed: "agent:chart" });
	app.artifacts.source.set("reef.md", "# Reef\n");
	const voyageId = VoyageId.make("voyage:reef");
	const pieceId = PieceId.make("piece:reef");
	yield* app.api.voyages.open({
		requestId: Id.Request.make(voyageId),
		kind: "voyage",
		name: "Reef",
		northStar: "Safe passage",
		context: "Sound the reef",
		captainBackend: null,
		captainEffort: null,
		captainModel: null,
		crewBackend: null,
		crewEffort: null,
		crewModel: null,
	});
	yield* app.api.pieces.charter({
		requestId: Id.Request.make(pieceId),
		voyageId,
		title: "Reef chart",
		charter: "Make a chart",
		expectation: "A chart",
		role: "hand",
		dependsOn: [],
	});
	yield* landArtifact({
		requestId: Id.Request.make("artifact:reef"),
		pieceId,
		authorAgentId: artifactAuthor("agent:chart"),
		path: "reef.md",
		title: "Reef chart",
		supersedesArtifactId: null,
	});
	app.artifacts.source.clear();
	const artifactId = ArtifactId.make("artifact:reef");
	const result = yield* readArtifact(artifactId);
	expect(result).toMatchObject({ title: "Reef chart", markdown: "# Reef\n", byteSize: 7 });
});
