import type * as Source from "@antumbra/domain-backends/commands/observe-capability.ts";
import { Effect } from "effect";

export const observeCapability = (input: typeof Source.observeCapability.Input.Type) =>
	Effect.succeed({ backend: input.backend, imageInput: input.imageInput });
