import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { StartId } from "@antumbra/domain-starts/ids.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import type { Operation } from "@antumbra/platform-runner/operations.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Layer, Option } from "effect";
import { expect } from "vitest";
import { admission } from "#starts/admission.ts";
import { execute } from "#starts/execution.ts";
import { resources } from "#starts/resources.ts";

it.app("provision refusal holds the start and explicit retry reuses its prepared resources", function* (app) {
	const id = StartId.make("birth");
	yield* app.api.starts.request({
		requestId: Request.make(id),
		agentId: AgentId.make("agent"),
		sessionId: SessionId.make("session"),
		voyageId: null,
		pieceId: null,
		source: "direct",
		backend: "claude",
		model: "chosen-model",
		effort: "high",
		role: "crew",
		charter: "Inspect the assigned reef",
		toolSetVersion: "frozen-v1",
		tools: [],
	});
	yield* app.api.starts.admit({ requestId: Request.make("admit"), id });
	const sent: Operation[] = [];
	let refused = true;
	const runner = Layer.succeed(RunnerOperations, {
		connected: Effect.succeed([{ runnerId: "runner", logId: "log", backends: ["claude"], imageInputBackends: [] }]),
		execute: (_runnerId, operation) =>
			Effect.sync(() => {
				sent.push(operation);
				if (operation.type === "Plan") return { type: "MooragePlanned" as const, plan: { root: "/prepared/agent", berths: [] } };
				if (operation.type === "Provision" && refused) return { type: "Refused" as const, reason: "Repository authentication required" };
				return { type: "Accepted" as const };
			}),
	});
	const prepared = resources.pipe(Layer.provideMerge(runner));
	const first = (yield* answered(app.api.starts.admitted({})))[0];
	if (first === undefined) return yield* Effect.die("Missing admitted start");
	yield* execute(first).pipe(Effect.provide(prepared));
	expect(yield* answered(app.api.starts.bySession({ sessionId: first.sessionId }))).toMatchObject({
		status: "waiting",
		detail: "Repository authentication required",
	});
	expect(Option.getOrThrow(yield* answered(app.api.reclamation.current({ agentId: first.agentId })))).toMatchObject({
		root: "/prepared/agent",
		status: "provisioning",
	});
	expect(yield* app.rows.session.count({})).toBe(0);
	refused = false;
	yield* app.api.starts.retry({ requestId: Request.make("retry"), id });
	yield* app.api.starts.admit({ requestId: Request.make("readmit"), id });
	const retried = (yield* answered(app.api.starts.admitted({})))[0];
	if (retried === undefined) return yield* Effect.die("Missing retried start");
	yield* execute(retried).pipe(Effect.provide(prepared));
	expect(Option.getOrThrow(yield* answered(app.api.reclamation.current({ agentId: first.agentId })))).toMatchObject({
		root: "/prepared/agent",
		status: "ready",
	});
	expect(sent.find((operation) => operation.type === "Start")).toMatchObject({
		requestId: "retry",
		sessionId: "session",
		options: {
			cwd: "/prepared/agent",
			model: "chosen-model",
			effort: "high",
			toolSet: { version: "frozen-v1", tools: [] },
		},
		charter: { id: "birth:charter", parts: [{ type: "text", text: "Inspect the assigned reef" }] },
	});
	expect(yield* app.rows.session.count({})).toBe(0);
	expect(yield* answered(app.api.agents.byId({ id: first.agentId }))).toMatchObject({ status: "spawning" });
});

it.app("raising the running budget admits the next held birth", function* (app) {
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 1 });
	for (const id of ["first", "second"]) {
		yield* app.api.starts.request({
			requestId: Request.make(id),
			agentId: AgentId.make(id),
			sessionId: SessionId.make(`session:${id}`),
			voyageId: null,
			pieceId: null,
			source: "direct",
			backend: "claude",
			model: null,
			effort: null,
			role: "crew",
			charter: "Sound the reef",
			toolSetVersion: "crew-v1",
			tools: [],
		});
		yield* app.clock.advance(1);
	}
	yield* admission;
	expect((yield* eventually(app.api.starts.admitted({}), (births) => births.length === 1)).map((birth) => birth.id)).toEqual(["first"]);
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 2 });
	expect((yield* eventually(app.api.starts.admitted({}), (births) => births.length === 2)).map((birth) => birth.id)).toEqual(["first", "second"]);
});
