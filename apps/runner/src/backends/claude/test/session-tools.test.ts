import { sessionToolCall } from "@antumbra/runner-backends-claude/adapters/session-tools.ts";
import type { DirectTool } from "@antumbra/runner-ports/tools.ts";
import { expect, it } from "@effect/vitest";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { Deferred, Effect, Exit, Queue, Scope } from "effect";
import { makeToolServer } from "#backends/claude/adapters/tool-server.ts";

interface Wire extends Transport {
	readonly receive: (message: JSONRPCMessage) => void;
	readonly sent: Queue.Queue<JSONRPCMessage>;
}

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

it.live("a waiting call ends with its session", () =>
	Effect.gen(function* () {
		const wire = yield* openWire;
		const started = yield* Deferred.make<void>();
		const interrupted = yield* Deferred.make<void>();
		const session = yield* Effect.flatMap(Effect.scope, Scope.fork);
		const call = yield* sessionToolCall.pipe(Scope.provide(session));
		const server = makeToolServer([waitForRuling(started, interrupted)], call);
		yield* Effect.promise(() => server.connect(wire));
		yield* Scope.addFinalizer(
			session,
			Effect.promise(() => wire.close()),
		);
		wire.receive(callTool(2, "wait_for_ruling"));
		yield* Deferred.await(started);
		yield* Scope.close(session, Exit.void);
		yield* Deferred.await(interrupted);
	}),
);

it.live("session-local servers preserve request identity and expose only their bound tools", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const first = yield* openWire;
			const second = yield* openWire;
			const called = yield* Queue.unbounded<string>();
			const call = yield* sessionToolCall;
			const report: DirectTool = { ...landReport, call: (callId) => Queue.offer(called, callId).pipe(Effect.as({ ok: true, text: "accepted" })) };
			const firstServer = makeToolServer([report], call);
			const secondServer = makeToolServer([], call);
			yield* Effect.promise(() => firstServer.connect(first));
			yield* Effect.promise(() => secondServer.connect(second));
			yield* Effect.addFinalizer(() => Effect.promise(() => firstServer.close()));
			yield* Effect.addFinalizer(() => Effect.promise(() => secondServer.close()));
			first.receive(callTool(41, "land_report"));
			second.receive(callTool(41, "land_report"));
			expect(yield* Queue.take(called)).toMatch(/:41$/);
			expect(yield* Queue.take(first.sent)).toMatchObject({ id: 41, result: { isError: false } });
			expect(yield* Queue.take(second.sent)).toMatchObject({
				id: 41,
				result: { isError: true, content: [{ text: "antumbra serves no tool named land_report" }] },
			});
		}),
	),
);
