import { artifactContent } from "@antumbra/domain-artifacts/queries/content.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import { Effect } from "effect";
import { readArtifact } from "#adapters/artifacts/acts/read.ts";
export const artifactContentHandlers = artifactContent
	.middleware(Token)
	.toLayer(Effect.succeed({ "artifacts.read": ({ artifactId }) => readArtifact(artifactId) }));
