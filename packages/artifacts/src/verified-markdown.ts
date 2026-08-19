import { Effect, FileSystem, Option, Path } from "effect";
import {
	decodeMarkdown,
	digestBytes,
	isArtifactDigest,
	isSafeArtifactBasename,
	MAX_ARTIFACT_MARKDOWN_BYTES,
	readOpened,
} from "#content.ts";
import {
	StoredArtifactContentInvalid,
	type StoredArtifactContentInvalidReason,
} from "#errors.ts";

interface StoredArtifactIdentity {
	readonly basename: string;
	readonly byteSize: number;
	readonly digest: string;
}

const invalid = (
	artifactId: string,
	reason: StoredArtifactContentInvalidReason,
) => new StoredArtifactContentInvalid({ artifactId, reason });

const sameObject = (
	opened: FileSystem.File.Info,
	resolved: FileSystem.File.Info,
): boolean =>
	opened.dev === resolved.dev &&
	Option.isSome(opened.ino) &&
	Option.isSome(resolved.ino) &&
	opened.ino.value === resolved.ino.value;

const validateIdentity = (artifactId: string, row: StoredArtifactIdentity) =>
	Effect.gen(function* () {
		if (!isArtifactDigest(row.digest)) {
			return yield* invalid(artifactId, "digest");
		}
		if (!isSafeArtifactBasename(row.basename)) {
			return yield* invalid(artifactId, "basename");
		}
		if (!Number.isSafeInteger(row.byteSize) || row.byteSize < 0) {
			return yield* invalid(artifactId, "size");
		}
		if (row.byteSize > MAX_ARTIFACT_MARKDOWN_BYTES) {
			return yield* invalid(artifactId, "too_large");
		}
	});

const openStoredArtifact = (
	root: string,
	artifactId: string,
	row: StoredArtifactIdentity,
) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const path = yield* Path.Path;
		const canonicalRoot = yield* fs
			.realPath(root)
			.pipe(Effect.mapError(() => invalid(artifactId, "path")));
		const expected = path.join(canonicalRoot, row.digest, row.basename);
		const exists = yield* fs
			.exists(expected)
			.pipe(Effect.mapError(() => invalid(artifactId, "path")));
		if (!exists) {
			return yield* invalid(artifactId, "missing");
		}
		const file = yield* fs
			.open(expected, { flag: "r" })
			.pipe(Effect.mapError(() => invalid(artifactId, "path")));
		const opened = yield* file.stat.pipe(
			Effect.mapError(() => invalid(artifactId, "path")),
		);
		const resolved = yield* fs
			.realPath(expected)
			.pipe(Effect.mapError(() => invalid(artifactId, "path")));
		const observed = yield* fs
			.stat(resolved)
			.pipe(Effect.mapError(() => invalid(artifactId, "path")));
		if (resolved !== expected) {
			return yield* invalid(artifactId, "path");
		}
		if (
			opened.type !== "File" ||
			observed.type !== "File" ||
			!sameObject(opened, observed)
		) {
			return yield* invalid(artifactId, "not_file");
		}
		if (opened.size !== BigInt(row.byteSize)) {
			return yield* invalid(artifactId, "size");
		}
		return { file, size: opened.size };
	});

const readAndVerify = (
	artifactId: string,
	row: StoredArtifactIdentity,
	opened: Effect.Success<ReturnType<typeof openStoredArtifact>>,
) =>
	Effect.gen(function* () {
		const bytes = yield* readOpened(opened.file, opened.size).pipe(
			Effect.mapError(() => invalid(artifactId, "path")),
		);
		if (bytes.length !== row.byteSize) {
			return yield* invalid(artifactId, "size");
		}
		const observedDigest = yield* digestBytes(bytes).pipe(
			Effect.mapError(() => invalid(artifactId, "digest")),
		);
		if (observedDigest !== row.digest) {
			return yield* invalid(artifactId, "digest");
		}
		return yield* Effect.try({
			catch: () => invalid(artifactId, "not_utf8"),
			try: () => decodeMarkdown(bytes),
		});
	});

export const readVerifiedMarkdown = (
	root: string,
	artifactId: string,
	row: StoredArtifactIdentity,
) =>
	Effect.gen(function* () {
		yield* validateIdentity(artifactId, row);
		const opened = yield* openStoredArtifact(root, artifactId, row);
		return yield* readAndVerify(artifactId, row, opened);
	});
