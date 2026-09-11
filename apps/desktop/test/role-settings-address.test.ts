import { it } from "@effect/vitest";
import { Effect, Layer, Ref } from "effect";
import { expect } from "vitest";
import { ServerProcess } from "#adapters/server-process.ts";
import { addressOf } from "#adapters/server-reach.ts";

const RESPAWNED = [7001, 7002] as const;

const respawning = Layer.effect(ServerProcess)(
	Effect.map(Ref.make(0), (reads) => ({
		serving: Effect.map(
			Ref.getAndUpdate(reads, (seen) => seen + 1),
			(seen) => ({ port: RESPAWNED[seen] ?? RESPAWNED[1], token: "token" }),
		),
	})),
);

it.effect("the socket address follows the server process to the port it serves now", () =>
	Effect.gen(function* () {
		const { serving } = yield* ServerProcess;

		expect(yield* addressOf(serving)).toBe("ws://127.0.0.1:7001/rpc");
		expect(yield* addressOf(serving)).toBe("ws://127.0.0.1:7002/rpc");
	}).pipe(Effect.provide(respawning)),
);
