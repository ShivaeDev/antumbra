import { answered } from "@antumbra/app-testing/answers.ts";
import { click, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { Diagnostics } from "#diagnostics.tsx";

it.glass("a requested birth remains diagnosable before its conversation starts", function* ({ api, render }) {
	const agentId = AgentId.make("agent:surveyor");
	const sessionId = SessionId.make("session:surveyor");
	yield* api.starts.request({
		requestId: Request.make("start:surveyor"),
		agentId,
		sessionId,
		source: "direct",
		voyageId: null,
		pieceId: null,
		backend: "scripted",
		model: null,
		effort: null,
		role: "surveyor",
		charter: "Chart the reef",
		toolSetVersion: "test",
		tools: [],
	});
	const agent = yield* answered(api.agents.reading({ id: agentId }));
	if (agent === null) return yield* Effect.die("Missing requested Agent reading");
	const container = yield* render(<Diagnostics api={api} agent={agent} />);
	const disclosure = container.querySelector("summary");
	if (disclosure === null) return yield* Effect.die("Missing Agent diagnostics disclosure");
	yield* click(disclosure);
	yield* until(() => container.textContent?.includes("birth · requested") === true, "the pending birth diagnostic");
	expect(container.textContent).toContain("current session:");
});
