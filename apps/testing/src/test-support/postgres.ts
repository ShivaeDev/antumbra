import { postgresTests } from "@antumbra/app-testing/postgres-testing.ts";
import { createInstanceEngine, createIsolationEngine } from "@antumbra/app-testing/test-support/postgres-control.ts";
import { binaries } from "@antumbra/server-storage/instance.ts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { Clock, Layer } from "effect";
import * as TestClock from "effect/testing/TestClock";
import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";

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
