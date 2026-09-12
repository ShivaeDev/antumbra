import { createHash } from "node:crypto";
import { basename } from "node:path";
import { ArtifactSourceNotOwned, StoredArtifactContentInvalid } from "@antumbra/domain-artifacts/content.ts";
import { ArtifactFiles, ArtifactSource } from "@antumbra/domain-artifacts/ports/content.ts";
import { Context, Effect, Layer } from "effect";

export class ScriptedArtifacts extends Context.Service<ScriptedArtifacts, { readonly source: Map<string, string> }>()(
	"@antumbra/app-testing/ScriptedArtifacts",
) {}

export const layer = Layer.effectContext(
	Effect.sync(() => {
		const source = new Map<string, string>();
		const stored = new Map<string, string>();
		return Context.make(ScriptedArtifacts, { source }).pipe(
			Context.add(ArtifactSource, {
				read: ({ authorAgentId, path }) =>
					Effect.suspend(() => {
						const markdown = source.get(path);
						return markdown === undefined
							? Effect.fail(new ArtifactSourceNotOwned({ agentId: authorAgentId, path }))
							: Effect.succeed({ basename: basename(path), bytes: new TextEncoder().encode(markdown) });
					}),
			}),
			Context.add(ArtifactFiles, {
				publish: ({ basename, bytes }) =>
					Effect.sync(() => {
						const digest = createHash("sha256").update(bytes).digest("hex");
						stored.set(digest, new TextDecoder().decode(bytes));
						return { basename, digest, byteSize: bytes.length };
					}),
				read: ({ id, digest }) =>
					Effect.suspend(() => {
						const markdown = stored.get(digest);
						return markdown === undefined
							? Effect.fail(new StoredArtifactContentInvalid({ artifactId: id, reason: "path" }))
							: Effect.succeed(markdown);
					}),
			}),
		);
	}),
);
