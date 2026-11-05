import { authenticateSocket } from "@shivaedev/contract/socketAuthentication.ts";
import { Effect, Layer } from "effect";
import * as RpcClient from "effect/rpc/RpcClient";
import * as Socket from "effect/socket/Socket";
import { Credential } from "#credential.ts";
import { serialization } from "#serialization.ts";

const authenticated = Layer.effect(
	Socket.Socket,
	Effect.flatMap(Credential, ({ token }) => authenticateSocket(token)),
);
export const transport = RpcClient.layerProtocolSocket().pipe(Layer.provide(serialization), Layer.provide(authenticated));
