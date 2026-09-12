import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Layer } from "effect";
import { landArtifact } from "#acts/land.ts";
import { ArtifactSourceNotOwned, StoredArtifactContentInvalid } from "#content.ts";
import { ArtifactFiles, ArtifactSource } from "#ports/content.ts";
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
export const custody = () => {
	const stored = new Map<string, string>();
	const source = new Map([
		["old.md", "# Old soundings"],
		["new.md", "# New soundings"],
		["third.md", "# Third soundings"],
	]);
	return {
		source,
		layer: Layer.merge(
			Layer.succeed(ArtifactSource, {
				read: ({ authorAgentId, path }) => {
					const markdown = source.get(path);
					return markdown === undefined
						? Effect.fail(new ArtifactSourceNotOwned({ agentId: authorAgentId, path }))
						: Effect.succeed({ basename: path, bytes: new TextEncoder().encode(markdown) });
				},
			}),
			Layer.succeed(ArtifactFiles, {
				publish: ({ basename, bytes }) =>
					Effect.sync(() => {
						const digest = Array.from(bytes).join("-");
						stored.set(digest, new TextDecoder().decode(bytes));
						return { basename, digest, byteSize: bytes.length };
					}),
				read: ({ id, digest }) => {
					const markdown = stored.get(digest);
					return markdown === undefined
						? Effect.fail(new StoredArtifactContentInvalid({ artifactId: id, reason: "path" }))
						: Effect.succeed(markdown);
				},
			}),
		),
	};
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
