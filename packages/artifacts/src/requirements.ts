import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import type { Context, Effect } from "effect";
import { Crypto, FileSystem, Path } from "effect";

const artifactServices = [
	Crypto.Crypto,
	Database,
	DomainFeeds,
	FileSystem.FileSystem,
	Path.Path,
	Writer,
] as const;

export type ArtifactsRequirements =
	| Context.Service.Identifier<(typeof artifactServices)[number]>
	| WriteExecutors;

export type ArtifactsReturn<
	Success,
	Failure = never,
	Passthrough = never,
> = Effect.fn.Return<Success, Failure, ArtifactsRequirements | Passthrough>;
