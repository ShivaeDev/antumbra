import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { connectRunner, type LogEntry } from "@antumbra/app-testing/runner.ts";
import { voyageBoard } from "@antumbra/domain-boards/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { smootherWords } from "@antumbra/platform-prompts/smoother.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { expect } from "vitest";

type Runner = Effect.Success<ReturnType<typeof connectRunner>>;
const registration = { runnerId: "smoother-runner", logId: "smoother-log", backends: ["claude"], imageInputBackends: [] };

const nextSessionOperation = Effect.fnUntraced(function* (runner: Runner, entries: readonly LogEntry[]) {
	while (true) {
		const operation = yield* runner.next;
		if (operation.type === "Start" || operation.type === "Stop") return operation;
		if (operation.type === "Plan") {
			yield* runner.reply(operation.requestId, { type: "MooragePlanned", plan: { root: `/smoother/${operation.agentId}`, berths: [] } });
		} else if (operation.type === "ReadLog") {
			yield* runner.reply(operation.requestId, { type: "LogRead", entries: entries.filter((entry) => entry.cursor > operation.after) });
		} else {
			yield* runner.reply(operation.requestId, { type: "Accepted" });
		}
	}
});

it.app("prepares an actual constrained birth, waits for logged acceptance, and closes before reusing its smoother", function* (app) {
	const runner = yield* connectRunner(registration);
	const entries: LogEntry[] = [];
	const voyageId = VoyageId.make("prepared-voyage");
	yield* app.api.voyages.open({
		name: "Prepared voyage",
		northStar: "Known",
		context: "",
		kind: "voyage",
		captainBackend: null,
		captainModel: null,
		captainEffort: null,
		crewBackend: null,
		crewModel: null,
		crewEffort: null,
		requestId: Request.make(voyageId),
	});
	yield* app.api.boards.write({ board: voyageBoard(voyageId), body: "The tide turned", register: "rough", author: null });
	yield* app.api.boards.requestSmoothing({ voyageId, pieceId: null, throughToday: true, requestId: Request.make("prepared-pass") });
	const start = yield* nextSessionOperation(runner, entries);
	if (start.type !== "Start") return yield* Effect.die("the smoother was not started");
	expect(start.options).toMatchObject({ constrainedPrompt: smootherWords, toolSet: { version: "smoothing-v1", tools: [{ name: "write_summary" }] } });
	expect(start.charter.parts).toMatchObject([{ type: "text", text: expect.stringContaining("The tide turned") }]);
	const common = { requestId: start.requestId, sessionId: start.sessionId };
	entries.push(
		{
			logId: registration.logId,
			cursor: 0,
			at: 100,
			event: {
				type: "SessionStarted",
				...common,
				agentId: start.options.agentId,
				backend: start.options.backend,
				cwd: start.options.cwd,
				nativeRef: "native",
				runnerId: registration.runnerId,
				toolSetVersion: start.options.toolSet.version,
			},
		},
		{ logId: registration.logId, cursor: 1, at: 101, event: { type: "InputAccepted", ...common, inputId: start.charter.id } },
	);
	yield* runner.append(entries);
	yield* runner.reply(start.requestId, { type: "Accepted" });
	expect(
		yield* runner.tool({ sessionId: start.sessionId, callId: "summary", name: "write_summary", input: { text: "The tide changed the approach" } }),
	).toEqual({ ok: true, text: "summary written" });
	const stop = yield* nextSessionOperation(runner, entries);
	if (stop.type !== "Stop") return yield* Effect.die("the smoother was not stopped");
	const ended: LogEntry = {
		logId: registration.logId,
		cursor: 2,
		at: 102,
		event: { type: "SessionEnded", requestId: stop.requestId, sessionId: stop.sessionId, reason: "summary received" },
	};
	entries.push(ended);
	yield* runner.append([ended]);
	yield* runner.reply(stop.requestId, { type: "Accepted" });
	yield* eventually(app.api.boards.smoothingState({ voyageId }), (state) => state.state === "idle" && state.uncovered === 0);
	expect(yield* answered(app.api.agents.smoother({ voyageId }))).toMatchObject({
		id: start.options.agentId,
		status: "alive",
		currentSessionId: null,
	});
	yield* app.api.boards.write({ board: voyageBoard(voyageId), body: "The wind backed", register: "rough", author: null });
	yield* app.api.boards.requestSmoothing({ voyageId, pieceId: null, throughToday: true, requestId: Request.make("next-pass") });
	const next = yield* nextSessionOperation(runner, entries);
	if (next.type !== "Start") return yield* Effect.die("the next smoothing pass was not started");
	expect(next.options.agentId).toBe(start.options.agentId);
	expect(next.sessionId).not.toBe(start.sessionId);
	yield* runner.reply(next.requestId, { type: "Refused", reason: "end of test" });
});
