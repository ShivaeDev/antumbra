import { answered, it } from "@antumbra/app-testing/entry.ts";
import { identity } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { expect } from "vitest";

const READABLE = /^[0-9abcdefghjkmnpqrstvwxyz]{10}$/;

it.app("a tool call's request id never becomes the name of the agent it asks for", function* (app) {
	const asked = requestId({ sessionId: "session-1", callId: "call-9" });
	const ids = identity(asked);
	expect(ids.agentId).toMatch(READABLE);
	expect(ids.sessionId).toMatch(READABLE);
	expect(ids.birthId).toMatch(READABLE);
	expect(new Set([ids.agentId, ids.sessionId, ids.birthId]).size).toBe(3);
	yield* app.api.agents.spawn({ requestId: asked, role: "hand", backend: "claude", model: null, effort: null });
	expect(yield* answered(app.api.agents.byId({ id: ids.agentId }), "the agent to be read")).toMatchObject({
		status: "spawning",
		currentSessionId: ids.sessionId,
	});
});
