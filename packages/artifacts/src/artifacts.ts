import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import { Context, Crypto, Effect, FileSystem, Layer, Path } from "effect";
import type { ArtifactFailure } from "#errors.ts";
import { landArtifact } from "#land.ts";
import type { ArtifactInput, ArtifactRow } from "#model.ts";

export class Artifacts extends Context.Service<
	Artifacts,
	{
		readonly land: (
			input: ArtifactInput,
		) => Effect.Effect<ArtifactRow, ArtifactFailure>;
	}
>()("@antumbra/artifacts/Artifacts") {}

export const ArtifactsLive = (root: string) =>
	Layer.effect(Artifacts)(
		Effect.gen(function* () {
			const db = yield* Database;
			const feeds = yield* DomainFeeds;
			const writer = yield* Writer;
			const crypto = yield* Crypto.Crypto;
			const fs = yield* FileSystem.FileSystem;
			const path = yield* Path.Path;
			const executors = yield* Effect.context<WriteExecutors>();
			const context = Context.merge(
				executors,
				Context.make(Database, db).pipe(
					Context.add(DomainFeeds, feeds),
					Context.add(Writer, writer),
					Context.add(Crypto.Crypto, crypto),
					Context.add(FileSystem.FileSystem, fs),
					Context.add(Path.Path, path),
				),
			);
			return {
				land: (input) => Effect.provide(landArtifact(root, input), context),
			};
		}),
	);
