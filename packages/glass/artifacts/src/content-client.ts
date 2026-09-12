import type { ArtifactId } from "@antumbra/domain-artifacts/ids.ts";
import { artifactContent } from "@antumbra/domain-artifacts/rpc.ts";
import { Effect } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";

export const contentClient = Effect.map(
	RpcClient.make(artifactContent),
	(client) => (artifactId: ArtifactId) => client["artifacts.read"]({ artifactId }),
);
