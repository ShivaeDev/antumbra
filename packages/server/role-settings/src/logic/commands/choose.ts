import type * as Source from "@antumbra/domain-role-settings/commands/choose.ts";
import { Effect } from "effect";

export const choose = (input: typeof Source.choose.Input.Type) =>
	Effect.succeed({ backend: input.backend, effort: input.effort, model: input.model, role: input.role, scope: input.scope });
