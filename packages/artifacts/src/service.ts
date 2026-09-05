import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { type Context, Crypto, Effect, FileSystem, Path } from "effect";
import { landArtifact } from "#land.ts";
import { deleteSupersession } from "#lineage/remove.ts";
import { writeSupersession } from "#lineage/write.ts";
import { readArtifactMarkdown } from "#read.ts";
import { ArtifactStorage } from "#storage.ts";

export const Artifacts = defineService({
	id: "@antumbra/artifacts/Artifacts",
	initialize: Effect.void,
	methods: () => ({
		land: landArtifact,
		readMarkdown: readArtifactMarkdown,
		removeSupersession: deleteSupersession,
		supersede: writeSupersession,
	}),
	requires: [Database, DomainFeeds, Crypto.Crypto, FileSystem.FileSystem, Path.Path, ArtifactStorage],
});

export type Artifacts = Context.Service.Identifier<typeof Artifacts>;
