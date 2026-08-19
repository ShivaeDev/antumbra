import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { type ArtifactFailure, ArtifactNotFound } from "#errors.ts";
import type { ArtifactMarkdown } from "#model.ts";
import type { ArtifactsReturn } from "#requirements.ts";
import { readVerifiedMarkdown } from "#verified-markdown.ts";

export const readArtifactMarkdown = Effect.fn("artifacts.readArtifactMarkdown")(
	function* (
		root: string,
		artifactId: string,
	): ArtifactsReturn<ArtifactMarkdown, ArtifactFailure> {
		return yield* Effect.scoped(
			Effect.gen(function* () {
				const db = yield* Database;
				const stored = yield* db.Artifact.where({ id: artifactId }).first();
				if (Option.isNone(stored)) {
					return yield* new ArtifactNotFound({ artifactId });
				}
				const row = stored.value;
				const markdown = yield* readVerifiedMarkdown(root, artifactId, row);
				return {
					artifactId,
					byteSize: row.byteSize,
					digest: row.digest,
					markdown,
					title: row.title,
				} satisfies ArtifactMarkdown;
			}),
		);
	},
);
