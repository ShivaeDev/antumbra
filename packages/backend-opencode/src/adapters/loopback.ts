import { createServer } from "node:http";
import { NodeHttpServer } from "@effect/platform-node";
import { Effect } from "effect";
import { HttpServer } from "effect/unstable/http";

export const LOOPBACK = "127.0.0.1";

export const freeLoopbackPort = Effect.scoped(
	Effect.map(NodeHttpServer.make(createServer, { host: LOOPBACK, port: 0 }), (probe) => new URL(HttpServer.formatAddress(probe.address)).port),
);
