import { decodeStoredMoorageStatus } from "@antumbra/agent-runtime-vocabulary";
import { Database } from "@antumbra/persistence";
import { Effect, FileSystem, Option, Path } from "effect";
import { ArtifactSourceNotOwned, artifactPublicationFailed } from "#errors.ts";
import type { ArtifactInput } from "#model.ts";

const sameObject = (
	opened: FileSystem.File.Info,
	resolved: FileSystem.File.Info,
): boolean =>
	opened.dev === resolved.dev &&
	Option.isSome(opened.ino) &&
	Option.isSome(resolved.ino) &&
	opened.ino.value === resolved.ino.value;

const concatenate = (
	chunks: ReadonlyArray<Uint8Array>,
	length: number,
): Uint8Array => {
	const bytes = new Uint8Array(length);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.length;
	}
	return bytes;
};

const readOpened = (
	file: FileSystem.File,
	remaining: bigint,
	chunks: ReadonlyArray<Uint8Array> = [],
	length = 0,
): Effect.Effect<Uint8Array, unknown> => {
	if (remaining === 0n) {
		return Effect.succeed(concatenate(chunks, length));
	}
	const requested = Number(remaining > 65_536n ? 65_536n : remaining);
	return file.readAlloc(requested).pipe(
		Effect.flatMap(
			Option.match({
				onNone: () => Effect.succeed(concatenate(chunks, length)),
				onSome: (chunk) =>
					readOpened(
						file,
						remaining - BigInt(chunk.length),
						[...chunks, chunk],
						length + chunk.length,
					),
			}),
		),
	);
};

export const readOwnedArtifact = (input: ArtifactInput) =>
	Effect.scoped(
		Effect.gen(function* () {
			const db = yield* Database;
			const fs = yield* FileSystem.FileSystem;
			const path = yield* Path.Path;
			const agentId = input.authorAgentId;
			if (agentId === undefined) {
				return yield* new ArtifactSourceNotOwned({
					agentId: null,
					uri: input.uri,
				});
			}
			const moorage = yield* db.Moorage.where({ agentId }).first();
			if (Option.isNone(moorage)) {
				return yield* new ArtifactSourceNotOwned({ agentId, uri: input.uri });
			}
			const status = yield* Effect.fromResult(
				decodeStoredMoorageStatus(moorage.value.agentId, moorage.value.status),
			);
			if (status !== "ready") {
				return yield* new ArtifactSourceNotOwned({ agentId, uri: input.uri });
			}
			const root = yield* fs
				.realPath(moorage.value.root)
				.pipe(Effect.mapError(artifactPublicationFailed("resolve moorage")));
			const requested = path.isAbsolute(input.uri)
				? input.uri
				: path.resolve(root, input.uri);
			const file = yield* fs
				.open(requested, { flag: "r" })
				.pipe(Effect.mapError(artifactPublicationFailed("open artifact")));
			const opened = yield* file.stat.pipe(
				Effect.mapError(artifactPublicationFailed("inspect opened artifact")),
			);
			const resolved = yield* fs
				.realPath(requested)
				.pipe(Effect.mapError(artifactPublicationFailed("resolve artifact")));
			const inside = path.relative(root, resolved);
			if (
				inside === "" ||
				inside === ".." ||
				inside.startsWith(`..${path.sep}`) ||
				path.isAbsolute(inside)
			) {
				return yield* new ArtifactSourceNotOwned({ agentId, uri: input.uri });
			}
			const observed = yield* fs
				.stat(resolved)
				.pipe(Effect.mapError(artifactPublicationFailed("inspect artifact")));
			if (
				opened.type !== "File" ||
				observed.type !== "File" ||
				!sameObject(opened, observed)
			) {
				return yield* new ArtifactSourceNotOwned({ agentId, uri: input.uri });
			}
			const bytes = yield* readOpened(file, BigInt(opened.size)).pipe(
				Effect.mapError(artifactPublicationFailed("read artifact")),
			);
			return {
				agentId,
				bytes,
				filename: path.basename(resolved),
				moorageRoot: moorage.value.root,
			};
		}),
	);
