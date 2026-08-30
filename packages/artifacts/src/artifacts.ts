import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Context, Crypto, Effect, FileSystem, Layer, Path } from "effect";
import type { ArtifactFailure } from "#errors.ts";
import { landArtifact } from "#land.ts";
import { deleteSupersession, writeSupersession } from "#lineage/write.ts";
import type { ArtifactInput, ArtifactLanding, ArtifactMarkdown, ArtifactSupersessionInput } from "#model.ts";
import { readArtifactMarkdown } from "#read.ts";

export class Artifacts extends Context.Service<
	Artifacts,
	{
		readonly land: (input: ArtifactInput) => Effect.Effect<ArtifactLanding, ArtifactFailure>;
		readonly readMarkdown: (artifactId: string) => Effect.Effect<ArtifactMarkdown, ArtifactFailure>;
		readonly removeSupersession: (input: ArtifactSupersessionInput) => Effect.Effect<void, ArtifactFailure>;
		readonly supersede: (input: ArtifactSupersessionInput) => Effect.Effect<void, ArtifactFailure>;
	}
>()("@antumbra/artifacts/Artifacts") {}

export const ArtifactsLive = (root: string) =>
	Layer.effect(Artifacts)(
		Effect.gen(function* () {
			const db = yield* Database;
			const feeds = yield* DomainFeeds;
			const crypto = yield* Crypto.Crypto;
			const fs = yield* FileSystem.FileSystem;
			const path = yield* Path.Path;
			const context = Context.make(Database, db).pipe(
				Context.add(DomainFeeds, feeds),
				Context.add(Crypto.Crypto, crypto),
				Context.add(FileSystem.FileSystem, fs),
				Context.add(Path.Path, path),
			);
			const announce = feeds.publishVoyageRefresh();
			const write = <A, E, R>(program: Effect.Effect<A, E, R>) => program.pipe(Effect.tap(() => announce));
			const removeSupersession = (input: ArtifactSupersessionInput) => Effect.provide(write(deleteSupersession(input)).pipe(Effect.asVoid), context);
			const supersede = (input: ArtifactSupersessionInput) => Effect.provide(write(writeSupersession(input)).pipe(Effect.asVoid), context);
			return {
				land: (input) => Effect.provide(landArtifact(root, input), context),
				readMarkdown: (artifactId) => Effect.provide(readArtifactMarkdown(root, artifactId), context),
				removeSupersession,
				supersede,
			};
		}),
	);
