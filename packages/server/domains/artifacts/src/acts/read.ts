import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Option, Stream } from "effect";
import { land } from "#commands/land.ts";
import type { ArtifactMarkdown } from "#content.ts";
import type { ArtifactId } from "#ids.ts";
import { ArtifactFiles } from "#ports/content.ts";
import { byId } from "#queries/by-id.ts";
export const readArtifact = Effect.fn("Artifacts.readArtifact")(function* (artifactId: ArtifactId) {
	const row = Option.getOrThrow(yield* Stream.runHead((yield* Live).live(byId, { id: artifactId })));
	if (row === null) return yield* new land.Rejection.ArtifactNotFound({ artifactId });
	const markdown = yield* (yield* ArtifactFiles).read(row);
	return { artifactId, title: row.title, markdown, digest: row.digest, byteSize: row.byteSize } satisfies ArtifactMarkdown;
});
