import { Database } from "@antumbra/persistence";
import { decodeStoredMoorageStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect, FileSystem, Option, Path } from "effect";
import { decodeMarkdown, isRelativeArtifactPath, MAX_ARTIFACT_MARKDOWN_BYTES, readOpened, sameObject } from "#content.ts";
import { ArtifactContentInvalid, ArtifactPublicationFailed, ArtifactSourceNotOwned, artifactPublicationFailed } from "#errors.ts";
import type { ArtifactInput } from "#model.ts";

const invalidPathReason = (value: string) => {
	if (value.length === 0) {
		return "empty_path" as const;
	}
	if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) {
		return "uri" as const;
	}
	return "absolute_path" as const;
};

const requireReadyMoorage = (agentId: string, artifactPath: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const moorage = yield* db.Moorage.where({ agentId }).first();
		if (Option.isNone(moorage)) {
			return yield* new ArtifactSourceNotOwned({ agentId, path: artifactPath });
		}
		const status = yield* Effect.fromResult(decodeStoredMoorageStatus(moorage.value.agentId, moorage.value.status));
		if (status !== "ready") {
			return yield* new ArtifactSourceNotOwned({ agentId, path: artifactPath });
		}
		return moorage.value.root;
	});

const readFromMoorage = (rootPath: string, agentId: string, input: ArtifactInput) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const path = yield* Path.Path;
		const root = yield* fs.realPath(rootPath).pipe(Effect.mapError(artifactPublicationFailed("resolve moorage")));
		const requested = path.resolve(root, input.path);
		const file = yield* fs.open(requested, { flag: "r" }).pipe(Effect.mapError(artifactPublicationFailed("open artifact")));
		const opened = yield* file.stat.pipe(Effect.mapError(artifactPublicationFailed("inspect opened artifact")));
		const resolved = yield* fs.realPath(requested).pipe(Effect.mapError(artifactPublicationFailed("resolve artifact")));
		const inside = path.relative(root, resolved);
		if (inside === "" || inside === ".." || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) {
			return yield* new ArtifactSourceNotOwned({
				agentId,
				path: input.path,
			});
		}
		const observed = yield* fs.stat(resolved).pipe(Effect.mapError(artifactPublicationFailed("inspect artifact")));
		if (opened.type !== "File" || observed.type !== "File" || !sameObject(opened, observed)) {
			return yield* new ArtifactSourceNotOwned({
				agentId,
				path: input.path,
			});
		}
		if (opened.size > BigInt(MAX_ARTIFACT_MARKDOWN_BYTES)) {
			return yield* new ArtifactContentInvalid({
				path: input.path,
				reason: "too_large",
			});
		}
		const bytes = yield* readOpened(file, opened.size).pipe(Effect.mapError(artifactPublicationFailed("read artifact")));
		if (bytes.length !== Number(opened.size)) {
			return yield* new ArtifactPublicationFailed({
				detail: "artifact changed while being read",
			});
		}
		yield* Effect.try({
			catch: () => new ArtifactContentInvalid({ path: input.path, reason: "not_utf8" }),
			try: () => decodeMarkdown(bytes),
		});
		return { basename: path.basename(resolved), bytes };
	});

export const readOwnedArtifact = (input: ArtifactInput) =>
	Effect.scoped(
		Effect.gen(function* () {
			const agentId = input.authorAgentId;
			if (agentId === undefined) {
				return yield* new ArtifactSourceNotOwned({
					agentId: null,
					path: input.path,
				});
			}
			if (!isRelativeArtifactPath(input.path)) {
				return yield* new ArtifactContentInvalid({
					path: input.path,
					reason: invalidPathReason(input.path),
				});
			}
			const moorageRoot = yield* requireReadyMoorage(agentId, input.path);
			const source = yield* readFromMoorage(moorageRoot, agentId, input);
			return {
				basename: source.basename,
				bytes: source.bytes,
			};
		}),
	);
