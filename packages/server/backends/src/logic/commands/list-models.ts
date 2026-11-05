import type * as Source from "@antumbra/domain-backends/commands/list-models.ts";
import { Effect } from "effect";

export const listModels = (input: typeof Source.listModels.Input.Type) =>
	Effect.succeed({ backend: input.backend, failure: input.failure, models: input.models });
