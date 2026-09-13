import { eventually, it } from "@antumbra/app-testing/entry.ts";
import { connectRunner, type LogEntry } from "@antumbra/app-testing/runner.ts";
import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { voyageBoard } from "@antumbra/domain-boards/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { TranscriptRpc } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { smootherWords } from "@antumbra/platform-prompts/smoother.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Stream } from "effect";
import * as RpcTest from "effect/unstable/rpc/RpcTest";
import { expect } from "vitest";

const raw = { source: "claude", kind: "event", payload: "{}" };
const voyageId = VoyageId.make("opening-voyage");
const sessionId = SessionId.make("opening-session");
const agentId = AgentId.make("opening-smoother");

it.app("the transcript opens with the words the session was started with, and a wake adds its own turn", function* ({ api }) {
	const runner = yield* connectRunner({ runnerId: "runner", logId: "log", backends: ["claude"], imageInputBackends: [] });
	yield* api.voyages.open({
		requestId: Request.make(voyageId),
		name: "Reef",
		northStar: "Survey",
		context: "",
		kind: "voyage",
		captainBackend: null,
		captainModel: null,
		captainEffort: null,
		crewBackend: null,
		crewModel: null,
		crewEffort: null,
	});
	yield* api.boards.requestSmoothing({ voyageId, pieceId: null, throughToday: true, requestId: Request.make("opening-pass") });
	yield* api.boards.bindSmoothingSession({
		requestId: Request.make("opening-binding"),
		attemptId: "opening-pass",
		agentId,
		sessionId,
		board: voyageBoard(voyageId),
		pieceId: null,
		title: "2026-01-01",
		level: "day",
		coversFrom: 0,
		coversTo: 0,
	});
	yield* api.agents.smooth({ requestId: Request.make("opening-smooth"), agentId, sessionId, voyageId, cwd: "/berth" });
	const start = yield* runner.next;
	if (start.type !== "Start") return yield* Effect.die(`Expected Start, received ${start.type}`);
	const charter = start.charter.parts[0];
	if (charter.type !== "text") return yield* Effect.die("Expected the charter to open with text");
	const entries: LogEntry[] = [
		{
			logId: "log",
			cursor: 0,
			at: 0,
			event: {
				type: "SessionStarted",
				requestId: start.requestId,
				sessionId,
				agentId,
				backend: "claude",
				cwd: "/berth",
				nativeRef: "native",
				runnerId: "runner",
				toolSetVersion: "smoothing-v1",
			},
		},
		{ logId: "log", cursor: 1, at: 1, event: { type: "InputAccepted", requestId: start.requestId, sessionId, inputId: start.charter.id } },
		{
			logId: "log",
			cursor: 2,
			at: 2,
			event: { type: "ProviderEvent", observation: "live", sessionId, event: { type: "message", role: "user", text: charter.text, raw } },
		},
		{
			logId: "log",
			cursor: 3,
			at: 3,
			event: { type: "ProviderEvent", observation: "live", sessionId, event: { type: "message", role: "agent", text: "Summarised.", raw } },
		},
	];
	yield* runner.reply(start.requestId, { type: "Accepted" });
	yield* Effect.forkScoped(
		Effect.forever(
			Effect.gen(function* () {
				const operation = yield* runner.next;
				const result =
					operation.type === "ReadLog"
						? { type: "LogRead" as const, entries: entries.filter((entry) => entry.cursor > operation.after) }
						: { type: "Accepted" as const };
				yield* runner.reply(operation.requestId, result);
			}),
		),
	);
	yield* runner.append(entries);
	const rpc = yield* RpcTest.makeClient(TranscriptRpc.middleware(Token), { flatten: true });
	const updates = yield* Stream.toQueue(rpc("sessions.transcript", { id: sessionId }), { capacity: "unbounded" });
	const opened = yield* eventually(Stream.fromQueue(updates), (reading) =>
		reading.items.some((item) => item.kind === "message" && item.role === "agent"),
	);
	const [first] = opened.items;
	expect(first).toMatchObject({ kind: "message", role: "user", served: "charter" });
	expect(first?.kind === "message" ? first.text : "").toBe(`${smootherWords}\n\n${charter.text}`);
	expect(opened.items.filter((item) => item.kind === "message" && item.role === "user")).toHaveLength(1);
	yield* api.sessions.request({
		requestId: Request.make("opening-wake"),
		sessionId,
		kind: "wake",
		inputId: null,
		reason: "Finish the summary",
		requestedAt: new Date(4).toISOString(),
	});
	const woken = yield* eventually(Stream.fromQueue(updates), (reading) =>
		reading.items.some((item) => item.kind === "message" && item.text === "Finish the summary"),
	);
	expect(woken.items.at(-1)).toMatchObject({ kind: "message", role: "user", served: "wake", text: "Finish the summary" });
});
