import type { ArtifactId } from "@antumbra/domain-artifacts/ids.ts";
import { StoredArtifactContentInvalid } from "@antumbra/domain-artifacts/queries/content.ts";
import { Effect, FileSystem, Path } from "effect";
import { digestBytes, readOpened } from "#adapters/artifacts/content.ts";
import type { PublishedArtifact } from "#adapters/artifacts/ports.ts";
import { ArtifactStorage } from "#adapters/artifacts/storage.ts";

type StoredArtifactContentInvalidReason = StoredArtifactContentInvalid["reason"];
interface StoredArtifactIdentity {
	readonly basename: string;
	readonly byteSize: number;
	readonly digest: string;
}

const invalid = (artifactId: ArtifactId, reason: StoredArtifactContentInvalidReason) => new StoredArtifactContentInvalid({ artifactId, reason });

const openStoredArtifact = Effect.fnUntraced(function* (root: string, artifactId: ArtifactId, row: StoredArtifactIdentity) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const expected = path.join(root, row.digest, row.basename);
	const file = yield* fs.open(expected, { flag: "r" }).pipe(Effect.mapError(() => invalid(artifactId, "path")));
	const opened = yield* file.stat.pipe(Effect.mapError(() => invalid(artifactId, "path")));
	if (opened.type !== "File") {
		return yield* invalid(artifactId, "not_file");
	}
	if (opened.size !== BigInt(row.byteSize)) {
		return yield* invalid(artifactId, "size");
	}
	return { file, size: opened.size };
});

const readAndVerify = Effect.fnUntraced(function* (
	artifactId: ArtifactId,
	row: StoredArtifactIdentity,
	opened: Effect.Success<ReturnType<typeof openStoredArtifact>>,
) {
	const bytes = yield* readOpened(opened.file, opened.size).pipe(Effect.mapError(() => invalid(artifactId, "path")));
	if (bytes.length !== row.byteSize) {
		return yield* invalid(artifactId, "size");
	}
	const observedDigest = yield* digestBytes(bytes).pipe(Effect.mapError(() => invalid(artifactId, "digest")));
	if (observedDigest !== row.digest) {
		return yield* invalid(artifactId, "digest");
	}
	return new TextDecoder().decode(bytes);
});

export const readArtifact = Effect.fn("ArtifactFiles.read")(function* (row: PublishedArtifact & { readonly id: ArtifactId }) {
	const { root } = yield* ArtifactStorage;
	const opened = yield* openStoredArtifact(root, row.id, row);
	return yield* readAndVerify(row.id, row, opened);
}, Effect.scoped);
