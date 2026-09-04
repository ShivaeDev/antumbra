import { Database } from "@antumbra/persistence";
import { Effect, FileSystem, Option, Path } from "effect";
import { digestBytes, readOpened } from "#content.ts";
import { ArtifactNotFound, StoredArtifactContentInvalid, type StoredArtifactContentInvalidReason } from "#errors.ts";
import type { ArtifactMarkdown } from "#model.ts";

interface StoredArtifactIdentity {
	readonly basename: string;
	readonly byteSize: number;
	readonly digest: string;
}

const invalid = (artifactId: string, reason: StoredArtifactContentInvalidReason) => new StoredArtifactContentInvalid({ artifactId, reason });

const openStoredArtifact = Effect.fnUntraced(function* (root: string, artifactId: string, row: StoredArtifactIdentity) {
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
	artifactId: string,
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

export const readArtifactMarkdown = Effect.fn("Artifacts.readMarkdown")(function* (root: string, artifactId: string) {
	const db = yield* Database;
	const stored = yield* db.Artifact.where({ id: artifactId }).first();
	if (Option.isNone(stored)) {
		return yield* new ArtifactNotFound({ artifactId });
	}
	const row = stored.value;
	const opened = yield* openStoredArtifact(root, artifactId, row);
	const markdown = yield* readAndVerify(artifactId, row, opened);
	return {
		artifactId,
		byteSize: row.byteSize,
		digest: row.digest,
		markdown,
		title: row.title,
	} satisfies ArtifactMarkdown;
}, Effect.scoped);
