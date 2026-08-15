import { Data, Effect, Option, Ref, type Scope } from "effect";
import type { AgentBackend } from "#backend.ts";
import type { ChangeHost } from "#change-host.ts";
import type { Runner } from "#runner.ts";

export class DuplicateBackendTag extends Data.TaggedError(
	"DuplicateBackendTag",
)<{
	readonly tag: string;
}> {}

export class DuplicateRunnerTag extends Data.TaggedError("DuplicateRunnerTag")<{
	readonly tag: string;
}> {}

export class DuplicateChangeHostTag extends Data.TaggedError(
	"DuplicateChangeHostTag",
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
	readonly registerChangeHost: (
		host: ChangeHost,
	) => Effect.Effect<void, DuplicateChangeHostTag>;
	readonly registerRunner: (
		runner: Runner,
	) => Effect.Effect<void, DuplicateRunnerTag>;
	readonly secrets: SecretsApi;
	readonly settings: SettingsApi;
}

// why: activation is scoped to the host that runs it — a plugin may hold a
// resource that outlives any one session (a shared provider process, a
// connection) and it is released when the host layer tears down, never
// leaked and never tied to a session's lifetime.
export interface AntumbraPlugin {
	readonly activate: (
		context: PluginContext,
	) => Effect.Effect<void, unknown, Scope.Scope>;
	readonly name: string;
}

export interface PluginHost {
	readonly backends: Effect.Effect<ReadonlyMap<string, AgentBackend>>;
	readonly changeHosts: Effect.Effect<ReadonlyMap<string, ChangeHost>>;
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
	const changeHostRegistry = yield* Ref.make<ReadonlyMap<string, ChangeHost>>(
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
		registerChangeHost: registerInto(
			changeHostRegistry,
			(tag) => new DuplicateChangeHostTag({ tag }),
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
		changeHosts: Ref.get(changeHostRegistry),
		context,
		runners: Ref.get(runnerRegistry),
	} satisfies PluginHost;
});
