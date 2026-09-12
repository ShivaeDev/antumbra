import { land } from "@antumbra/domain-artifacts/commands/land.ts";
import type { ArtifactId } from "@antumbra/domain-artifacts/ids.ts";
import { byId } from "@antumbra/domain-artifacts/queries/by-id.ts";
import type { ArtifactMarkdown } from "@antumbra/domain-artifacts/queries/content.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Option, Stream } from "effect";
import { ArtifactFiles } from "#adapters/artifacts/ports.ts";
export const readArtifact = Effect.fn("Artifacts.readArtifact")(function* (artifactId: ArtifactId) {
	const row = Option.getOrThrow(yield* Stream.runHead((yield* Live).live(byId, { id: artifactId })));
	if (row === null) return yield* new land.Rejection.ArtifactNotFound({ artifactId });
	const markdown = yield* (yield* ArtifactFiles).read(row);
	return { artifactId, title: row.title, markdown, digest: row.digest, byteSize: row.byteSize } satisfies ArtifactMarkdown;
});
