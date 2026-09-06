import { Context, Effect, Layer, Option, Schema } from "effect";
import * as Headers from "effect/unstable/http/Headers";
import * as RpcMiddleware from "effect/unstable/rpc/RpcMiddleware";

export const header = "x-antumbra-token";

export class Unauthorized extends Schema.TaggedError<Unauthorized>()("Unauthorized", {}) {}

export class ClientToken extends Context.Service<ClientToken, { readonly token: string }>()("@antumbra/rpc/ClientToken") {}

export class ServerToken extends Context.Service<ServerToken, { readonly token: string }>()("@antumbra/rpc/ServerToken") {}

export class Token extends RpcMiddleware.Service<Token>()("@antumbra/rpc/Token", { error: Unauthorized, requiredForClient: true }) {}

const same = (expected: string, given: string): boolean => {
	let difference = expected.length ^ given.length;
	for (let index = 0; index < expected.length; index += 1) {
		difference |= expected.charCodeAt(index) ^ (given.charCodeAt(index) | 0);
	}
	return difference === 0;
};

const presented = (headers: Headers.Headers): string => Option.getOrElse(Headers.get(headers, header), () => "");

const guard =
	(expected: string): RpcMiddleware.RpcMiddleware<never, Unauthorized, never> =>
	(effect, options) =>
		same(expected, presented(options.headers)) ? effect : Effect.fail(new Unauthorized());

export const layerServer: Layer.Layer<Token, never, ServerToken> = Layer.effect(
	Token,
	Effect.map(ServerToken, (server) => guard(server.token)),
);

export const layerClient: Layer.Layer<RpcMiddleware.ForClient<Token>, never, ClientToken> = RpcMiddleware.layerClient(Token, ({ next, request }) =>
	Effect.flatMap(ClientToken, (client) => next({ ...request, headers: Headers.set(request.headers, header, client.token) })),
);
