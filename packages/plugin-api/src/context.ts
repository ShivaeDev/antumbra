import { Data, Effect, Option, Ref } from "effect";
import type { AgentBackend } from "#backend.ts";
import type { Runner } from "#runner.ts";

export class DuplicateBackendTag extends Data.TaggedError(
	"DuplicateBackendTag",
)<{
	readonly tag: string;
}> {}

export class DuplicateRunnerTag extends Data.TaggedError("DuplicateRunnerTag")<{
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
	readonly registerRunner: (
		runner: Runner,
	) => Effect.Effect<void, DuplicateRunnerTag>;
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
	readonly runners: Effect.Effect<ReadonlyMap<string, Runner>>;
}

const registerInto =
	<Registered extends { readonly tag: string }, Failure>(
		registry: Ref.Ref<ReadonlyMap<string, Registered>>,
		duplicate: (tag: string) => Failure,
	) =>
	(entry: Registered): Effect.Effect<void, Failure> =>
		Effect.gen(function* () {
			const current = yield* Ref.get(registry);
			if (current.has(entry.tag)) {
				return yield* Effect.fail(duplicate(entry.tag));
			}
			yield* Ref.set(registry, new Map(current).set(entry.tag, entry));
		});

export const makePluginHost = Effect.gen(function* () {
	const backendRegistry = yield* Ref.make<ReadonlyMap<string, AgentBackend>>(
		new Map(),
	);
	const runnerRegistry = yield* Ref.make<ReadonlyMap<string, Runner>>(
		new Map(),
	);
	const empty = {
		get: () => Effect.succeed(Option.none<string>()),
	};
	const context: PluginContext = {
		registerAgentBackend: registerInto(
			backendRegistry,
			(tag) => new DuplicateBackendTag({ tag }),
		),
		registerRunner: registerInto(
			runnerRegistry,
			(tag) => new DuplicateRunnerTag({ tag }),
		),
		secrets: empty,
		settings: empty,
	};
	return {
		backends: Ref.get(backendRegistry),
		context,
		runners: Ref.get(runnerRegistry),
	} satisfies PluginHost;
});
