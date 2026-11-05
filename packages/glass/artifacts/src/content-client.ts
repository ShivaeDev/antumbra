import { artifactContent } from "@antumbra/domain-artifacts/queries/content.ts";
import { Owner } from "@antumbra/platform-access/policy.ts";
import type { ArtifactId } from "@antumbra/platform-vocabulary/artifacts-ids.ts";
import { Effect } from "effect";
import * as RpcClient from "effect/rpc/RpcClient";

export const contentClient = Effect.map(
	RpcClient.make(artifactContent.middleware(Owner)),
	(client) => (artifactId: ArtifactId) => client["artifacts.read"]({ artifactId }),
);
