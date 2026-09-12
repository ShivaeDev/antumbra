import type { ArtifactMarkdown } from "@antumbra/domain-artifacts/content.ts";
import type { artifacts } from "@antumbra/domain-artifacts/feature.ts";
import type { ArtifactId } from "@antumbra/domain-artifacts/ids.ts";
import type { Glass } from "@antumbra/glass-client/connect.ts";
import type { Effect } from "effect";
export type ArtifactsGlass = Glass<readonly [typeof artifacts]>;
export type ArtifactsApi = ArtifactsGlass["api"];
export type ReadArtifact = (artifactId: ArtifactId) => Effect.Effect<ArtifactMarkdown, unknown>;
