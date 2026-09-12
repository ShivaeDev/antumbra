import { Token } from "@antumbra/platform-rpc/token.ts";
import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";
import { land } from "#commands/land.ts";
import { ArtifactMarkdown, StoredArtifactContentInvalid } from "#content.ts";
import { ArtifactId } from "#ids.ts";
export const artifactContent = RpcGroup.make(
	Rpc.make("artifacts.read", {
		payload: { artifactId: ArtifactId },
		success: ArtifactMarkdown,
		error: Schema.Union([land.Rejection.ArtifactNotFound, StoredArtifactContentInvalid]),
	}),
).middleware(Token);
