import { Owner } from "@antumbra/platform-access/policy.ts";
import { LifecycleRpc } from "@antumbra/platform-runner/lifecycle.ts";
import { AgentsContract } from "@antumbra/server-agents/contract.ts";
import * as NodeWS from "@effect/platform-node/NodeWS";
import { Context, Effect, Layer, Stream } from "effect";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { makeClient } from "@shivaedev/contract/bind.ts";
import { mountLive } from "@shivaedev/react/client/mountLive.ts";
import { ServerProcess } from "#adapters/server-process.ts";

const connecting = Effect.gen(function* () {
	const { serving } = yield* ServerProcess;
	const { socketPath, token } = yield* serving;
	const registry = AtomRegistry.make();
	yield* Effect.addFinalizer(() => Effect.sync(() => registry.dispose()));
	const client = makeClient(AgentsContract.middleware(Owner), {
		group: AgentsContract.middleware(Owner).merge(LifecycleRpc),
		url: `ws+unix://${socketPath}:/rpc`,
		bearerToken: token,
		webSocketConstructor: NodeWS.layerWebSocketConstructor,
		registry,
	});
	const release = yield* mountLive(client.api).pipe(Effect.provideService(AtomRegistry.AtomRegistry, registry));
	yield* Effect.addFinalizer(() => Effect.sync(release));
	const calls = yield* client.client;
	return { ...calls, "agents.workingCount": () => AtomRegistry.toStreamResult(registry, client.api.workingCount.query({})) };
});
const makeLifecycle = Effect.gen(function* () {
	const server = yield* ServerProcess;
	const open = connecting.pipe(Effect.provideService(ServerProcess, server));
	const call = (method: "drain" | "recordRestart" | "honorRestart" | "abandonRestart") => (input: { readonly requestId: string }) =>
		Effect.scoped(Effect.flatMap(open, (api) => api[`lifecycle.${method}`](input)));
	return {
		"lifecycle.drain": call("drain"),
		"lifecycle.recordRestart": call("recordRestart"),
		"lifecycle.honorRestart": call("honorRestart"),
		"lifecycle.abandonRestart": call("abandonRestart"),
		"agents.workingCount": () =>
			Stream.switchMap(Stream.concat(Stream.succeed(undefined), server.restarted), () =>
				Stream.unwrap(Effect.map(open, (api) => api["agents.workingCount"]())),
			),
	};
});
export class ShellLifecycle extends Context.Service<ShellLifecycle, Effect.Success<typeof makeLifecycle>>()("@antumbra/desktop/ShellLifecycle") {}
export const ShellLifecycleLayer = Layer.effect(ShellLifecycle, makeLifecycle);
export const lifecycle = (method: "drain" | "recordRestart" | "honorRestart" | "abandonRestart") =>
	ShellLifecycle.use((api) => Effect.suspend(() => api[`lifecycle.${method}`]({ requestId: crypto.randomUUID() })));
