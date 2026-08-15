import { Data, Effect, Option, Ref } from "effect";
import type { AgentBackend } from "#backend.ts";

export class DuplicateBackendTag extends Data.TaggedError(
	"DuplicateBackendTag",
)<{
	readonly tag: string;
}> {}

export interface SecretsApi {
	readonly get: (key: string) => Effect.Effect<Option.Option<string>>;
}

export interface SettingsApi {
	readonly get: (key: string) => Effect.Effect<Option.Option<string>>;
}

export interface PluginContext {
	readonly registerAgentBackend: (
		backend: AgentBackend,
	) => Effect.Effect<void, DuplicateBackendTag>;
	readonly secrets: SecretsApi;
	readonly settings: SettingsApi;
}

export interface AntumbraPlugin {
	readonly activate: (context: PluginContext) => Effect.Effect<void, unknown>;
	readonly name: string;
}

export interface PluginHost {
	readonly backends: Effect.Effect<ReadonlyMap<string, AgentBackend>>;
	readonly context: PluginContext;
}

// why: built-ins and loaded plugins register through this same host — the
// registration path cannot rot into fiction because everything load-bearing
// consumes it (D11). Secrets and settings are declared-but-empty in v0.
export const makePluginHost = Effect.gen(function* () {
	const registry = yield* Ref.make<ReadonlyMap<string, AgentBackend>>(
		new Map(),
	);
	const empty = {
		get: () => Effect.succeed(Option.none<string>()),
	};
	const context: PluginContext = {
		registerAgentBackend: (backend) =>
			Effect.gen(function* () {
				const current = yield* Ref.get(registry);
				if (current.has(backend.tag)) {
					return yield* new DuplicateBackendTag({ tag: backend.tag });
				}
				yield* Ref.set(registry, new Map(current).set(backend.tag, backend));
			}),
		secrets: empty,
		settings: empty,
	};
	return { backends: Ref.get(registry), context } satisfies PluginHost;
});
