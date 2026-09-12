import { agents } from "@antumbra/domain-agents/feature.ts";
import { loopback } from "@antumbra/platform-rpc/endpoint.ts";
import { group } from "@antumbra/platform-rpc/group.ts";
import { ClientToken } from "@antumbra/platform-rpc/token.ts";
import { transport } from "@antumbra/platform-rpc/transport.ts";
import { RestartRpc } from "@antumbra/platform-runner/lifecycle.ts";
import { NodeSocket } from "@effect/platform-node";
import { Context, Effect, Layer } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { ServerProcess } from "#adapters/server-process.ts";

const connecting = RpcClient.make(RestartRpc.merge(group([agents])));
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

export const lifecycle = (order: "drain" | "record" | "honor" | "abandon") =>
	ShellLifecycle.use((api) => Effect.suspend(() => api[`restart.${order}`]({ requestId: crypto.randomUUID() })));
