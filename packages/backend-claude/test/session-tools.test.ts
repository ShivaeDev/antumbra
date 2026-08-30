import type { DirectTool } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { Deferred, Effect, Exit, Queue, Scope } from "effect";
import { sessionToolCall } from "#adapters/session-tools.ts";
import { makeToolServer } from "#adapters/tool-server.ts";

interface Wire extends Transport {
	readonly receive: (message: JSONRPCMessage) => void;
	readonly sent: Queue.Queue<JSONRPCMessage>;
}

// why: the SDK's own in-memory pair hides which side wrote what, and the fact
// under test is whether the server side writes at all after it closed.
const openWire: Effect.Effect<Wire> = Effect.map(Queue.unbounded<JSONRPCMessage>(), (sent) => {
	const wire: Wire = {
		close: () => {
			wire.onclose?.();
			return Promise.resolve();
		},
		receive: (message) => wire.onmessage?.(message),
		send: (message) => {
			Queue.offerUnsafe(sent, message);
			return Promise.resolve();
		},
		sent,
		start: () => Promise.resolve(),
	};
	return wire;
});

const callTool = (id: number, name: string): JSONRPCMessage => ({
	id,
	jsonrpc: "2.0",
	method: "tools/call",
	params: { arguments: {}, name },
});

const landReport: DirectTool = {
	call: () => Effect.succeed({ ok: true, text: "report landed" }),
	description: "Land a report against your piece.",
	inputSchema: { properties: {}, type: "object" },
	name: "land_report",
};

const waitForRuling = (started: Deferred.Deferred<void>, interrupted: Deferred.Deferred<void>): DirectTool => ({
	call: () =>
		Deferred.succeed(started, undefined).pipe(
			Effect.andThen(Effect.never),
			Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined)),
		),
	description: "Wait for a ruling.",
	inputSchema: { properties: {}, type: "object" },
	name: "wait_for_ruling",
});

// why: the SDK settles a handler's promise through a chain of its own; one
// macrotask is the only boundary past which it can have written nothing more.
const promiseChainsSettled = Effect.promise(() => new Promise<void>((resolve) => setImmediate(resolve)));

it.live("a call answers on the session's own scope", () =>
	Effect.gen(function* () {
		const wire = yield* openWire;
		yield* Effect.scoped(
			Effect.gen(function* () {
				const call = yield* sessionToolCall;
				const server = makeToolServer([landReport], call);
				yield* Effect.promise(() => server.connect(wire));
				wire.receive(callTool(1, "land_report"));
				expect(yield* Queue.take(wire.sent)).toMatchObject({
					id: 1,
					result: { content: [{ text: "report landed" }], isError: false },
				});
			}),
		);
	}),
);

it.live("a waiting call ends with its session and never reaches the closed transport", () =>
	Effect.gen(function* () {
		const wire = yield* openWire;
		const started = yield* Deferred.make<void>();
		const interrupted = yield* Deferred.make<void>();
		const session = yield* Effect.flatMap(Effect.scope, Scope.fork);
		const call = yield* sessionToolCall.pipe(Scope.provide(session));
		const server = makeToolServer([waitForRuling(started, interrupted)], call);
		yield* Effect.promise(() => server.connect(wire));
		// why: the plugin acquires the SDK session after the calls' scope, so
		// on release the transport goes first and the calls after it.
		yield* Scope.addFinalizer(
			session,
			Effect.promise(() => wire.close()),
		);
		wire.receive(callTool(2, "wait_for_ruling"));
		yield* Deferred.await(started);
		yield* Scope.close(session, Exit.void);
		yield* Deferred.await(interrupted);
		yield* promiseChainsSettled;
		expect(yield* Queue.size(wire.sent)).toBe(0);
	}),
);
