import { agents } from "@antumbra/domain-agents/feature.ts";
import { LifecycleRpc } from "@antumbra/domain-lifecycle/commands/restart.ts";
import { loopback } from "@antumbra/platform-rpc/endpoint.ts";
import { group } from "@antumbra/platform-rpc/group.ts";
import { ClientToken, Token } from "@antumbra/platform-rpc/token.ts";
import { transport } from "@antumbra/platform-rpc/transport.ts";
import { NodeSocket } from "@effect/platform-node";
import { Context, Effect, Layer } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { ServerProcess } from "#adapters/server-process.ts";

const connecting = RpcClient.make(LifecycleRpc.middleware(Token).merge(group([agents])));
export class ShellLifecycle extends Context.Service<ShellLifecycle, Effect.Success<typeof connecting>>()("@antumbra/desktop/ShellLifecycle") {}
export const ShellLifecycleLayer = Layer.unwrap(
	Effect.gen(function* () {
		const { serving } = yield* ServerProcess;
		const { port, token } = yield* serving;
		return Layer.effect(ShellLifecycle)(connecting).pipe(
			Layer.provide(transport),
			Layer.provide(Layer.merge(NodeSocket.layerWebSocket(loopback(port)), Layer.succeed(ClientToken, { token }))),
		);
	}),
);

export const lifecycle = (method: "drain" | "recordRestart" | "honorRestart" | "abandonRestart") =>
	ShellLifecycle.use((api) => Effect.suspend(() => api[`lifecycle.${method}`]({ requestId: crypto.randomUUID() })));
