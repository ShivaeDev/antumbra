import { CodexServers, codexBackend } from "@antumbra/runner-backends-codex/backend.ts";
import { classifyCodexCapacity } from "@antumbra/runner-backends-codex/capacity.ts";
import type { OpenSessionOptions } from "@antumbra/runner-ports/backend.ts";
import { type BackendCapacitySource, makeBackendCapacityController } from "@antumbra/runner-ports/backend-capacity.ts";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import type { LineProcess } from "#backends/codex/process.ts";
import { makeCodexServers } from "#backends/codex/server.ts";
import { type FakeAppServer, makeFakeAppServer } from "#test/backends/codex/fake.ts";

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
	model: "gpt-5-codex",
	resume: Option.none(),
	sessionId: "session-1",
	tools: [],
});

const started = (fake: FakeAppServer) => fake.requests.some((request) => request.method === "thread/start");

const backendOver = (ordinarySpawn: () => LineProcess, constrainedSpawn: () => LineProcess, capacity: BackendCapacitySource) =>
	Effect.gen(function* () {
		const ordinary = yield* makeCodexServers({ skills: "/antumbra/skills", spawn: ordinarySpawn });
		const constrained = yield* makeCodexServers({ skills: undefined, spawn: constrainedSpawn });
		return yield* codexBackend.pipe(Effect.provideService(CodexServers, { constrained, ordinary, capacity }));
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
