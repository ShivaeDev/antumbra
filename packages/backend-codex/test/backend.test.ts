import { type BackendCapacitySource, makeBackendCapacityController, type OpenSessionOptions } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import type { LineProcess } from "#adapters/process.ts";
import { codexBackend } from "#backend.ts";
import { classifyCodexCapacity } from "#capacity.ts";
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

const session = (constrainedPrompt?: string): OpenSessionOptions => ({
	constrainedPrompt,
	cwd: "/moorage",
	effort: Option.none(),
	model: Option.none(),
	resume: Option.none(),
	sessionId: "session-1",
	tools: [],
});

const started = (fake: FakeAppServer) => fake.requests.some((request) => request.method === "thread/start");

const backendOver = (ordinarySpawn: () => LineProcess, constrainedSpawn: () => LineProcess, capacity: BackendCapacitySource) =>
	Effect.gen(function* () {
		const ordinary = yield* makeCodexServers({ skills: "/antumbra/skills", spawn: ordinarySpawn });
		const constrained = yield* makeCodexServers({ skills: undefined, spawn: constrainedSpawn });
		return codexBackend({ constrained, ordinary }, capacity);
	});

it.live("a constrained session opens on its own app-server while ordinary sessions share theirs", () =>
	Effect.gen(function* () {
		const capacity = yield* makeBackendCapacityController(classifyCodexCapacity);
		const plain = spawning();
		const narrow = spawning();
		const backend = yield* backendOver(plain.spawn, narrow.spawn, capacity.source);
		yield* backend.openSession(session());
		yield* backend.openSession(session());
		expect(plain.spawned).toHaveLength(1);
		expect(narrow.spawned).toHaveLength(0);
		yield* backend.openSession(session("Smooth this board."));
		expect(plain.spawned).toHaveLength(1);
		expect(narrow.spawned).toHaveLength(1);
		expect(narrow.spawned.every(started)).toBe(true);
	}),
);
