import type { Draft, Receipt } from "@antumbra/platform-vocabulary/inputs.ts";
import { Context, type Effect } from "effect";
import type { InputFailure } from "#commands/errors.ts";

export class InputDelivery extends Context.Service<
	InputDelivery,
	{
		readonly admit: (draft: Draft) => Effect.Effect<void, InputFailure>;
		readonly deliver: (input: { readonly sessionId: string; readonly inputId: string }) => Effect.Effect<Receipt["status"], InputFailure>;
	}
>()("@antumbra/domain-inputs/InputDelivery") {}
