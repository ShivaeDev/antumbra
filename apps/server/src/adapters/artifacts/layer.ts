import { ArtifactFiles } from "@antumbra/domain-artifacts/ports/files.ts";
import { Effect, type FileSystem, Layer, type Path } from "effect";
import type { Digest, SecureRandom } from "effect/crypto";
import { publishArtifact } from "#adapters/artifacts/publish.ts";
import { readArtifact } from "#adapters/artifacts/read.ts";
import type { ArtifactStorage } from "#adapters/artifacts/storage.ts";
export const artifactFiles = Layer.effect(
	ArtifactFiles,
	Effect.gen(function* () {
		const context = yield* Effect.context<Digest.Digest | SecureRandom.SecureRandom | FileSystem.FileSystem | Path.Path | ArtifactStorage>();
		return {
			publish: (source) => publishArtifact(source).pipe(Effect.provide(context)),
			read: (row) => readArtifact(row).pipe(Effect.provide(context)),
		};
	}),
);
