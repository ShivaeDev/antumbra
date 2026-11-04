import { land } from "@antumbra/domain-artifacts/commands/land.ts";
import { ArtifactFiles } from "@antumbra/domain-artifacts/ports/files.ts";
import type { ArtifactId } from "@antumbra/platform-vocabulary/artifacts-ids.ts";
import { Effect } from "effect";
import { byId } from "#queries/by-id.ts";

export const readContent = Effect.fn("Artifacts.readContent")(function* ({ artifactId }: { readonly artifactId: ArtifactId }) {
	const held = yield* byId({ id: artifactId });
	if (held === null) return yield* new land.Rejection.ArtifactNotFound({ artifactId });
	const markdown = yield* (yield* ArtifactFiles).read(held);
	return { artifactId, title: held.title, markdown, digest: held.digest, byteSize: held.byteSize };
});
