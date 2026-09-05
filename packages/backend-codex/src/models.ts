import type { BackendFailure, ModelChoice } from "@antumbra/plugin-api";
import { Effect, Option, Schema } from "effect";
import { codexFailure } from "#failure.ts";
import { ModelListResponse } from "#protocol.ts";
import type { CodexServer } from "#server.ts";

const decodeModels = Schema.decodeUnknownOption(ModelListResponse);

// Codex names a model on `thread/start` and `turn/start` by the same string this catalog calls `model`.
const catalogue = (response: unknown): Effect.Effect<ReadonlyArray<ModelChoice>, BackendFailure> =>
	Option.match(decodeModels(response), {
		onNone: () => Effect.fail(codexFailure("model/list returned no catalog")),
		onSome: ({ data }) =>
			Effect.succeed(
				data.map((model) => ({
					efforts: model.supportedReasoningEfforts.map((offered) => offered.reasoningEffort),
					id: model.model,
					isDefault: model.isDefault,
					name: model.displayName,
				})),
			),
	});

export const listCodexModels = (server: CodexServer): Effect.Effect<ReadonlyArray<ModelChoice>, BackendFailure> =>
	server.request("model/list", {}).pipe(Effect.flatMap(catalogue));
