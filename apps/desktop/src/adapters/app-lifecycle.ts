import { agents } from "@antumbra/domain-agents/feature.ts";
import { group } from "@antumbra/platform-rpc/group.ts";
import { ClientToken } from "@antumbra/platform-rpc/token.ts";
import { transport } from "@antumbra/platform-rpc/transport.ts";
import { LifecycleRpc } from "@antumbra/platform-runner/lifecycle.ts";
import { NodeSocket } from "@effect/platform-node";
import { Context, Effect, Layer } from "effect";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import { ServerProcess } from "#adapters/server-process.ts";

const connecting = RpcClient.make(LifecycleRpc.merge(group([agents])));
export class ShellLifecycle extends Context.Service<ShellLifecycle, Effect.Success<typeof connecting>>()("@antumbra/desktop/ShellLifecycle") {}
export const ShellLifecycleLayer = Layer.unwrap(
	Effect.gen(function* () {
		const { serving } = yield* ServerProcess;
		const { port, token } = yield* serving;
		return Layer.effect(ShellLifecycle)(connecting).pipe(
			Layer.provide(transport),
			Layer.provide(Layer.merge(NodeSocket.layerWebSocket(`ws://127.0.0.1:${port}/rpc`), Layer.succeed(ClientToken, { token }))),
		);
	}),
);

export const lifecycle = (method: "drain" | "recordRestart" | "honorRestart" | "abandonRestart") =>
	ShellLifecycle.use((api) => Effect.suspend(() => api[`lifecycle.${method}`]({ requestId: crypto.randomUUID() })));
