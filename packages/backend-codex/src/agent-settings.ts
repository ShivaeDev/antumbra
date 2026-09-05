import type { BackendFailure, OpenSessionOptions } from "@antumbra/plugin-api";
import { Effect, Option, Schema } from "effect";
import { codexFailure } from "#failure.ts";
import { ReasoningEffort } from "#protocol.ts";

export interface AgentSettings {
	readonly effort?: string;
	readonly model?: string;
}

const decodeEffort = Schema.decodeUnknownOption(ReasoningEffort);

export const chosenModel = (settings: AgentSettings): { readonly model?: string } => (settings.model === undefined ? {} : { model: settings.model });

export const agentSettings = (options: OpenSessionOptions): Effect.Effect<AgentSettings, BackendFailure> => {
	const model = Option.match(options.model, {
		onNone: (): AgentSettings => ({}),
		onSome: (id): AgentSettings => ({ model: id }),
	});
	return Option.match(options.effort, {
		onNone: () => Effect.succeed(model),
		onSome: (value) =>
			Option.match(decodeEffort(value), {
				onNone: () => Effect.fail(codexFailure(`effort ${JSON.stringify(value)} is not a reasoning effort; name one the chosen model advertises`)),
				onSome: (effort) => Effect.succeed({ ...model, effort }),
			}),
	});
};
