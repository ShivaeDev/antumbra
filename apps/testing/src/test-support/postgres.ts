import { binaries } from "@antumbra/server-journal/postgres/instance.ts";
import { postgresTests } from "@antumbra/server-journal/postgres/testing.ts";
import { createInstanceEngine, createIsolationEngine } from "@antumbra/server-journal/test-support/postgres.ts";
import { NodeServices } from "@effect/platform-node";
import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";
import { Clock, Layer } from "effect";
import * as TestClock from "effect/testing/TestClock";

export const postgres = storyKit({
	name: "Antumbra PostgreSQL",
	clock: "test",
	layer: postgresTests.pipe(Layer.provide(NodeServices.layer)),
	stages: [],
	create: createIsolationEngine,
	verbs: (engine) => ({ ...engine, clock: { now: () => Clock.currentTimeMillis, advance: (millis: number) => TestClock.adjust(millis) } }),
	inspect: (engine) => ({ published: engine.published() }),
});

export const postgresInstance = storyKit({
	name: "Antumbra PostgreSQL instance",
	clock: "test",
	layer: binaries.pipe(Layer.provideMerge(NodeServices.layer)),
	stages: ["storage"],
	create: createInstanceEngine,
	verbs: (engine, story) => ({
		...engine,
		restart: () => {
			story.tell("restart the app-owned instance with the same data directory");
			return engine.restart;
		},
	}),
	inspect: (engine) => ({ connection: engine.connection() }),
});

export const hasStoredEntry = (value: string) => postgresInstance.trait("storage", `${value} is stored`, (engine) => engine.store(value));
