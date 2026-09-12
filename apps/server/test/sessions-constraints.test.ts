import { it } from "@antumbra/app-testing/entry.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { expect } from "vitest";

it.app("waking a smoother retains its constraint and resolves the current smoother settings", function* ({ api }) {
	const runner = yield* connectRunner({ runnerId: "runner", logId: "log", backends: ["claude"], imageInputBackends: [] });
	const voyageId = VoyageId.make("constrained-voyage");
	const sessionId = SessionId.make("constrained-session");
	const agentId = AgentId.make("smoother");
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
	yield* api.starts.smooth({
		requestId: Request.make("smooth"),
		agentId,
		sessionId,
		voyageId,
		backend: "claude",
		model: "original",
		effort: null,
		charter: "Summarize",
		toolSetVersion: "limited",
		tools: [],
		constrainedPrompt: "Only write a summary",
		cwd: "/berth",
	});
	const start = yield* runner.next;
	if (start.type !== "Start") return yield* Effect.die(`Expected Start, received ${start.type}`);
	yield* runner.append([
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
				toolSetVersion: "limited",
			},
		},
		{ logId: "log", cursor: 1, at: 0, event: { type: "InputAccepted", requestId: start.requestId, sessionId, inputId: start.charter.id } },
		{ logId: "log", cursor: 2, at: 1, event: { type: "SessionDetached", sessionId } },
	]);
	yield* runner.reply(start.requestId, { type: "Accepted" });
	yield* api.roleSettings.choose({ scope: voyageId, role: "crew", backend: "claude", model: "crew-model", effort: "low" });
	yield* api.roleSettings.choose({ scope: voyageId, role: "smoother", backend: "claude", model: "current-smoother", effort: "high" });
	yield* api.sessions.request({
		requestId: Request.make("resume"),
		sessionId,
		kind: "wake",
		inputId: null,
		reason: "Finish the summary",
		requestedAt: new Date(2).toISOString(),
	});
	const wake = yield* runner.next;
	expect(wake).toMatchObject({
		type: "Wake",
		nativeRef: "native",
		options: { constrainedPrompt: "Only write a summary", model: "current-smoother", effort: "high", toolSet: { version: "limited", tools: [] } },
	});
	yield* runner.reply(wake.requestId, { type: "Accepted" });
});
