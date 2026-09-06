import { existsSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { serialization } from "@antumbra/rpc/serialization.ts";
import { NodeServices, NodeSocket } from "@effect/platform-node";
import { it } from "@effect/vitest";
import { Deferred, Effect, Layer, Option, Schema, Stream } from "effect";
import { ChildProcess } from "effect/unstable/process";
import * as RpcMessage from "effect/unstable/rpc/RpcMessage";
import * as RpcSerialization from "effect/unstable/rpc/RpcSerialization";
import * as Socket from "effect/unstable/socket/Socket";
import { expect } from "vitest";
import { isolatedTemp } from "#test/isolated.ts";

const temp = isolatedTemp();
const entry = fileURLToPath(new URL("../src/main.ts", import.meta.url));
const TOKEN = "app-level-test-token";
const PATIENCE = "5 seconds";

const Readiness = Schema.fromJsonString(Schema.Struct({ port: Schema.Int }));

const dataDirectory = (): string => mkdtempSync(join(temp, "antumbra-server-"));

const spawned = (args: readonly string[]) =>
	ChildProcess.make(process.execPath, [entry, ...args], {
		env: { ANTUMBRA_TOKEN: TOKEN },
		extendEnv: true,
		stderr: "inherit",
		stdout: "pipe",
	});

const listening = (directory: string) =>
	Effect.gen(function* () {
		const child = yield* spawned(["--data", directory]);
		const line = yield* Stream.runHead(Stream.splitLines(Stream.decodeText(child.stdout)));
		const { port } = yield* Schema.decodeUnknownEffect(Readiness)(Option.getOrUndefined(line));
		return { child, port };
	});

const pong = Effect.gen(function* () {
	const socket = yield* Socket.Socket;
	const format = yield* RpcSerialization.RpcSerialization;
	const parser = format.makeUnsafe();
	const answered = yield* Deferred.make<readonly unknown[]>();
	const write = yield* socket.writer;
	yield* Effect.forkScoped(socket.runRaw((message) => Deferred.succeed(answered, parser.decode(message))));
	const ping = parser.encode(RpcMessage.constPing);
	yield* ping === undefined ? Effect.die(RpcMessage.constPing) : write(ping);
	return yield* Deferred.await(answered);
});

it.live("answers the protocol's ping over the websocket it serves on the port it announced", () =>
	Effect.gen(function* () {
		const { port } = yield* listening(dataDirectory());
		const answered = yield* Effect.provide(pong, Layer.merge(NodeSocket.layerWebSocket(`ws://127.0.0.1:${port}/rpc`), serialization));
		expect(answered).toEqual([RpcMessage.constPong]);
	}).pipe(Effect.timeout(PATIENCE), Effect.provide(NodeServices.layer)),
);

it.live("ends with exit code 0 on SIGTERM and leaves its journal in the data directory", () =>
	Effect.gen(function* () {
		const directory = dataDirectory();
		const { child } = yield* listening(directory);
		const code = yield* Effect.timeout(Effect.andThen(child.kill(), child.exitCode), PATIENCE);
		expect(code).toBe(0);
		expect(existsSync(join(directory, "journal.db"))).toBe(true);
	}).pipe(Effect.provide(NodeServices.layer)),
);

it.live("exits 2 without announcing a port when no data directory is given", () =>
	Effect.gen(function* () {
		const child = yield* spawned([]);
		const announced = yield* Stream.runCollect(Stream.decodeText(child.stdout));
		const code = yield* Effect.timeout(child.exitCode, PATIENCE);
		expect(code).toBe(2);
		expect(announced).toEqual([]);
	}).pipe(Effect.provide(NodeServices.layer)),
);
