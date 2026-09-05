import { expect, it } from "@effect/vitest";
import { Effect, RcRef } from "effect";
import { TestClock } from "effect/testing";
import type { LineProcess } from "#adapters/process.ts";
import { makeCodexServers } from "#server.ts";
import { type FakeAppServer, makeFakeAppServer } from "#test/fake.ts";

const spawning = () => {
	const spawned: Array<FakeAppServer> = [];
	return {
		spawn: (): LineProcess => {
			const fake = makeFakeAppServer();
			spawned.push(fake);
			return fake.process;
		},
		spawned,
	};
};

const servers = (spawn: () => LineProcess) => makeCodexServers({ skills: "/antumbra/skills", spawn });

it.effect("a holder arriving within five idle minutes gets the app-server that is already up", () =>
	Effect.gen(function* () {
		const started = spawning();
		yield* Effect.scoped(
			Effect.gen(function* () {
				const pool = yield* servers(started.spawn);
				yield* Effect.scoped(RcRef.get(pool));
				yield* TestClock.adjust("4 minutes");
				yield* Effect.scoped(RcRef.get(pool));
			}),
		);

		expect(started.spawned).toHaveLength(1);
	}),
);

it.effect("a holder arriving after five idle minutes starts a fresh app-server", () =>
	Effect.gen(function* () {
		const started = spawning();
		yield* Effect.scoped(
			Effect.gen(function* () {
				const pool = yield* servers(started.spawn);
				yield* Effect.scoped(RcRef.get(pool));
				yield* TestClock.adjust("6 minutes");
				yield* Effect.scoped(RcRef.get(pool));
			}),
		);

		expect(started.spawned).toHaveLength(2);
	}),
);

it.effect("an app-server that exits while idle is not handed to the next holder", () =>
	Effect.gen(function* () {
		const started = spawning();
		yield* Effect.scoped(
			Effect.gen(function* () {
				const pool = yield* servers(started.spawn);
				yield* Effect.scoped(RcRef.get(pool));
				started.spawned[0]?.exit();
				yield* TestClock.adjust("4 minutes");
				yield* Effect.scoped(RcRef.get(pool));
			}),
		);

		expect(started.spawned).toHaveLength(2);
	}),
);
