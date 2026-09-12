import { createServer } from "node:http";
import { NodeHttpServer } from "@effect/platform-node";
import { Effect, type Scope } from "effect";
import { HttpServer, HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import { LOOPBACK } from "#backends/opencode/adapters/loopback.ts";

const onlyPosted = HttpServerResponse.empty({ headers: { allow: "POST" }, status: 405 });

export const serveToolRequests = (answer: (request: Request) => Promise<Response>): Effect.Effect<string, never, Scope.Scope> =>
	Effect.gen(function* () {
		const server = yield* NodeHttpServer.make(createServer, { host: LOOPBACK, port: 0 });
		const respond = Effect.gen(function* () {
			const request = yield* HttpServerRequest.HttpServerRequest;
			if (request.method !== "POST") {
				return onlyPosted;
			}
			const web = yield* HttpServerRequest.toWeb(request);
			return HttpServerResponse.fromWeb(yield* Effect.promise(() => answer(web)));
		});
		yield* server.serve(respond);
		return HttpServer.formatAddress(server.address);
	}).pipe(Effect.orDie);
