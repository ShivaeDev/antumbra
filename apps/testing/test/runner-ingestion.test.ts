import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Effect, Fiber } from "effect";
import { expect } from "vitest";
import { answered, it } from "#entry.ts";
import { inputApi } from "#inputs.ts";
import { connectRunner } from "#runner.ts";

it.app("one runner acceptance updates its input and session before advancing the cursor", function* ({ api }) {
	const runner = yield* connectRunner({ runnerId: "runner:scripted", logId: "log:scripted", backends: ["claude"] });
	const sessionId = SessionId.make("session:scripted");
	const inputId = SessionInputId.make("input:scripted");
	yield* runner.append([
		{
			logId: "log:scripted",
			cursor: 1,
			at: 0,
			event: {
				type: "SessionStarted",
				requestId: "start:scripted",
				sessionId,
				agentId: "agent:scripted",
				backend: "claude",
				nativeRef: "native:scripted",
				cwd: "/scripted",
				toolSetVersion: "1",
				runnerId: "runner:scripted",
			},
		},
	]);
	expect((yield* answered(api.sessions.reading({ id: sessionId })))?.executionStatus).toBe("idle");

	const inputs = yield* inputApi;
	const submitted = yield* Effect.forkScoped(inputs.submit({ id: inputId, sessionId, parts: [{ type: "text", text: "Continue sounding" }] }));
	const operation = yield* runner.next;
	if (operation.type !== "Deliver") return yield* Effect.die(new Error(`Expected input delivery, received ${operation.type}`));
	expect(operation.input.id).toBe(inputId);
	expect(operation.act).toBe("steer");

	const accepted = {
		logId: "log:scripted",
		cursor: 2,
		at: 1,
		event: {
			type: "InputAccepted" as const,
			requestId: operation.requestId,
			sessionId,
			inputId,
		},
	};
	expect(yield* runner.append([accepted])).toBe(2);
	expect((yield* answered(api.inputs.reading({ sessionId, id: inputId })))?.status).toBe("accepted");
	expect((yield* answered(api.sessions.reading({ id: sessionId })))?.executionStatus).toBe("active");
	expect(yield* runner.cursor).toBe(2);
	yield* runner.reply(operation.requestId, { type: "Accepted" });
	expect(yield* Fiber.join(submitted)).toEqual({ id: inputId, status: "accepted" });

	expect(yield* runner.append([accepted])).toBe(2);
	expect(yield* runner.cursor).toBe(2);
});
