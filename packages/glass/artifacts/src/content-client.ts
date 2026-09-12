import type { ArtifactId } from "@antumbra/domain-artifacts/ids.ts";
import { artifactContent } from "@antumbra/domain-artifacts/queries/content.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import { Effect } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";

export const contentClient = Effect.map(
	RpcClient.make(artifactContent.middleware(Token)),
	(client) => (artifactId: ArtifactId) => client["content.read"]({ artifactId }),
);
