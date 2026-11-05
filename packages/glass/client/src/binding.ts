import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";
import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import { contractOf } from "@antumbra/platform-feature/rpc.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { bind, makeClient } from "@shivaedev/contract/bind.ts";
import { composeBindings } from "@shivaedev/contract/composeBindings.ts";
import { Effect, Schema } from "effect";
import * as Atom from "effect/reactivity/Atom";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { RpcGroup } from "effect/rpc";
import type { Serving } from "#serving.ts";

export const binding = Effect.fn("Glass.binding")(function* (
	features: readonly FeatureShape[],
	serving: Serving,
	registry: AtomRegistry.AtomRegistry,
) {
	const contracts = features.map(contractOf);
	const primary = contracts[0];
	if (primary === undefined) return yield* Effect.die(new Error("Glass requires at least one feature"));
	const client = makeClient(primary, {
		url: `http://127.0.0.1:${serving.port}/rpc`,
		bearerToken: serving.token,
		group: RpcGroup.make().merge(...contracts),
		registry,
	});
	const bindings = features.map((feature) => ({ feature, bound: bind(contractOf(feature), client.Client, { registry }) }));
	const run = <A, E>(effect: Effect.Effect<A, E, typeof client.Client.Identifier | import("effect/reactivity/Reactivity").Reactivity>) =>
		AtomRegistry.getResult(registry, client.runtime.atom(effect));
	const featuresApi: Array<readonly [string, Record<string, unknown>]> = [];
	for (const { feature, bound } of bindings) {
		const commands: Array<readonly [string, unknown]> = [];
		for (const command of feature.commands) {
			const send = (input: Record<string, unknown>) =>
				run(
					bound[command.name]?.run({ requestId: Id.Request.make(Id.make()), ...input }) ?? Effect.die(new Error(`Missing command ${command.name}`)),
				).pipe(
					Effect.flatMap(Schema.decodeUnknownEffect(Schema.Number)),
					Effect.catchIf(
						(error): error is AlreadyDone => error instanceof AlreadyDone,
						(done) => Effect.succeed(done.seq),
					),
				);
			commands.push([command.name, Object.assign(send, { command })]);
		}
		const queries = feature.queries.map((query) => {
			const atom = (input: Record<string, unknown>) =>
				bound[query.name]?.query(input) ?? Atom.make(Effect.die(new Error(`Missing query ${query.name}`)));
			return [query.name, Object.assign((input: Record<string, unknown>) => AtomRegistry.toStreamResult(registry, atom(input)), { atom })];
		});
		featuresApi.push([feature.name, Object.fromEntries([...commands, ...queries])]);
	}
	const api = Object.fromEntries(featuresApi);
	return {
		api: composeBindings(
			api,
			bindings.map(({ bound }) => bound),
		),
		client,
	};
});
