import { Data, Effect, type Option, Ref, type Scope } from "effect";
import type { AgentBackend } from "#backend.ts";
import type { ChangeHost } from "#change-host.ts";
import type { Runner } from "#runner.ts";

class DuplicateBackendTag extends Data.TaggedError("DuplicateBackendTag")<{
	readonly tag: string;
}> {}

class DuplicateRunnerTag extends Data.TaggedError("DuplicateRunnerTag")<{
	readonly tag: string;
}> {}

class DuplicateChangeHostTag extends Data.TaggedError("DuplicateChangeHostTag")<{
	readonly tag: string;
}> {}

export interface PluginContext {
	readonly findExecutable: (name: string) => Effect.Effect<Option.Option<string>>;
	readonly registerAgentBackend: (backend: AgentBackend) => Effect.Effect<void, DuplicateBackendTag>;
	readonly registerChangeHost: (host: ChangeHost) => Effect.Effect<void, DuplicateChangeHostTag>;
	readonly registerRunner: (runner: Runner) => Effect.Effect<void, DuplicateRunnerTag>;
}

export interface AntumbraPlugin {
	readonly activate: (context: PluginContext) => Effect.Effect<void, unknown, Scope.Scope>;
	readonly name: string;
}

interface PluginHost {
	readonly backends: Effect.Effect<ReadonlyMap<string, AgentBackend>>;
	readonly changeHosts: Effect.Effect<ReadonlyMap<string, ChangeHost>>;
	readonly context: PluginContext;
	readonly runners: Effect.Effect<ReadonlyMap<string, Runner>>;
}

const registerInto =
	<Registered extends { readonly tag: string }, Failure>(registry: Ref.Ref<ReadonlyMap<string, Registered>>, duplicate: (tag: string) => Failure) =>
	(entry: Registered): Effect.Effect<void, Failure> =>
		Effect.gen(function* () {
			const current = yield* Ref.get(registry);
			if (current.has(entry.tag)) {
				return yield* Effect.fail(duplicate(entry.tag));
			}
			yield* Ref.set(registry, new Map(current).set(entry.tag, entry));
		});

export const makePluginHost = (host: Pick<PluginContext, "findExecutable">) =>
	Effect.gen(function* () {
		const backendRegistry = yield* Ref.make<ReadonlyMap<string, AgentBackend>>(new Map());
		const runnerRegistry = yield* Ref.make<ReadonlyMap<string, Runner>>(new Map());
		const changeHostRegistry = yield* Ref.make<ReadonlyMap<string, ChangeHost>>(new Map());
		const context: PluginContext = {
			findExecutable: host.findExecutable,
			registerAgentBackend: registerInto(backendRegistry, (tag) => new DuplicateBackendTag({ tag })),
			registerChangeHost: registerInto(changeHostRegistry, (tag) => new DuplicateChangeHostTag({ tag })),
			registerRunner: registerInto(runnerRegistry, (tag) => new DuplicateRunnerTag({ tag })),
		};
		return {
			backends: Ref.get(backendRegistry),
			changeHosts: Ref.get(changeHostRegistry),
			context,
			runners: Ref.get(runnerRegistry),
		} satisfies PluginHost;
	});
