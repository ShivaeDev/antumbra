import type { ReadArtifact } from "@antumbra/glass-artifacts/glass.ts";
import type { InputsClient } from "@antumbra/glass-inputs/client.ts";
import type { Drafts } from "@antumbra/glass-inputs/drafts.ts";
import type { SessionsClient } from "@antumbra/glass-sessions/client.ts";
import type { RendererApi } from "#api.ts";
import type { Shell } from "#shell.ts";

export interface RendererProps {
	readonly api: RendererApi;
	readonly shell: Shell;
	readonly inputs: InputsClient;
	readonly sessions: SessionsClient;
	readonly drafts: Drafts;
	readonly readArtifact: ReadArtifact;
}
