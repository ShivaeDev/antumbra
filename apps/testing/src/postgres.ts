import { postgresTests } from "@antumbra/server-journal/postgres/testing.ts";
import { NodeServices } from "@effect/platform-node";
import { withIsolatedDatabase } from "@shivaedev/test-sql/server/withIsolatedDatabase.ts";
import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";
import { Clock, Layer } from "effect";
import { TestClock } from "effect/testing";
import { create } from "#postgres-engine.ts";
export const postgresApp = storyKit({
	name: "Antumbra PostgreSQL application",
	clock: "test",
	layer: postgresTests.pipe(Layer.provideMerge(NodeServices.layer)),
	stages: ["facts"],
	around: withIsolatedDatabase,
	create,
	verbs: (engine) => ({
		...engine,
		clock: { now: () => Clock.currentTimeMillis, advance: (millis: number) => TestClock.adjust(millis) },
	}),
	inspect: () => ({}),
});
