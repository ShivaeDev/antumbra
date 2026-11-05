import { artifactContent } from "@antumbra/domain-artifacts/queries/content.ts";
import { Owner } from "@antumbra/platform-access/policy.ts";
import { Effect } from "effect";
import { readArtifact } from "#adapters/artifacts/acts/read.ts";
export const artifactContentHandlers = artifactContent
	.middleware(Owner)
	.toLayer(Effect.succeed({ "artifacts.read": ({ artifactId }) => readArtifact(artifactId) }));
