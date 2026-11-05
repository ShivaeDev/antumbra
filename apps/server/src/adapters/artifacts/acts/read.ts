import { land } from "@antumbra/domain-artifacts/commands/land.ts";
import { ArtifactFiles } from "@antumbra/domain-artifacts/ports/files.ts";
import { byId } from "@antumbra/domain-artifacts/queries/by-id.ts";
import type { ArtifactMarkdown } from "@antumbra/domain-artifacts/queries/content.ts";
import type { ArtifactId } from "@antumbra/platform-vocabulary/artifacts-ids.ts";
import { Artifacts } from "@antumbra/server-artifacts/service.ts";
import { Effect, Option, Stream } from "effect";
import { stream } from "effect/reactivity/Reactivity";
import { keysOf } from "#keys.ts";
export const readArtifact = Effect.fn("Artifacts.readArtifact")(function* (artifactId: ArtifactId) {
	const artifactsService = yield* Artifacts;

	const row = Option.getOrThrow(
		yield* Stream.runHead(stream(keysOf(byId.reads, byId.scope?.({ id: artifactId })))(artifactsService.byId({ id: artifactId }).pipe(Effect.orDie))),
	);
	if (row === null) return yield* new land.Rejection.ArtifactNotFound({ artifactId });
	const markdown = yield* (yield* ArtifactFiles).read(row);
	return { artifactId, title: row.title, markdown, digest: row.digest, byteSize: row.byteSize } satisfies ArtifactMarkdown;
});
