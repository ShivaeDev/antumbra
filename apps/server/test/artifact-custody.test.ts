import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it } from "@antumbra/app-testing/entry.ts";
import { ArtifactId } from "@antumbra/domain-artifacts/ids.ts";
import { ArtifactSource } from "@antumbra/domain-artifacts/ports/content.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { expect } from "vitest";
import { landArtifact } from "#adapters/artifacts/acts/land.ts";
import { readArtifact } from "#adapters/artifacts/acts/read.ts";
import { artifactFiles } from "#adapters/artifacts/layer.ts";
import { ArtifactStorage } from "#adapters/artifacts/storage.ts";

it.app("artifact storage keeps published bytes after their source is removed", function* (app) {
	const root = yield* Effect.acquireRelease(
		Effect.sync(() => mkdtempSync(join(tmpdir(), "antumbra-artifact-"))),
		(path) => Effect.sync(() => rmSync(path, { recursive: true, force: true })),
	);
	const source = join(root, "reef.md");
	writeFileSync(source, "# Reef\n");
	const files = artifactFiles.pipe(
		Layer.provide(NodeServices.layer),
		Layer.provide(Layer.succeed(ArtifactStorage, { root: join(root, "published") })),
	);
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
		authorAgentId: "agent:chart",
		path: "reef.md",
		title: "Reef chart",
		supersedesArtifactId: null,
	}).pipe(
		Effect.provide(files),
		Effect.provideService(ArtifactSource, { read: () => Effect.sync(() => ({ basename: "reef.md", bytes: readFileSync(source) })) }),
	);
	rmSync(source);
	const artifactId = ArtifactId.make("artifact:reef");
	const result = yield* readArtifact(artifactId).pipe(Effect.provide(files));
	expect(result).toMatchObject({ title: "Reef chart", markdown: "# Reef\n", byteSize: 7 });
	expect(readFileSync(join(root, "published", result.digest, "reef.md"), "utf8")).toBe("# Reef\n");
});
