import { current } from "@antumbra/domain-reclamation/queries/moorage.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Layer, Option, Stream } from "effect";
import { ArtifactPublicationFailed, ArtifactSourceNotOwned } from "#adapters/artifacts/errors.ts";
import { ArtifactSource } from "#adapters/artifacts/ports.ts";

export const artifactSource = Layer.effect(
	ArtifactSource,
	Effect.gen(function* () {
		const live = yield* Live;
		const runners = yield* RunnerOperations;
		return ArtifactSource.of({
			read: Effect.fn("Artifacts.readSource")(function* (input) {
				const found = Option.getOrThrow(yield* Stream.runHead(live.live(current, { agentId: input.authorAgentId })));
				if (Option.isNone(found) || found.value.status !== "ready")
					return yield* new ArtifactSourceNotOwned({ agentId: input.authorAgentId, path: input.path });
				const result = yield* runners.execute(found.value.runner, {
					type: "ReadArtifact",
					requestId: JSON.stringify([input.requestId, "artifact-source"]),
					agentId: input.authorAgentId,
					moorageRoot: found.value.root,
					relativePath: input.path,
				});
				if (result.type === "Refused") return yield* new ArtifactPublicationFailed({ detail: result.reason });
				if (result.type !== "ArtifactRead") return yield* Effect.die(new Error(`Unexpected artifact source reply: ${result.type}`));
				return { basename: result.name, bytes: new TextEncoder().encode(result.content) };
			}),
		});
	}),
);
