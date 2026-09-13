import { AgentId } from "@antumbra/domain-agents/ids.ts";
import type { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import { expect, it } from "@effect/vitest";
import { crewing } from "#piece-session.tsx";

const crewMember = {
	atWork: false,
	backend: null,
	canInterrupt: false,
	canRetire: true,
	canSend: false,
	canSleep: false,
	createdAt: "2026-09-01T00:00:00.000Z",
	currentSessionId: null,
	id: AgentId.make("hand"),
	idleSince: null,
	pieceIds: [],
	presence: null,
	role: "hand",
	standing: "No open conversation",
	status: "alive",
	updatedAt: "2026-09-01T00:00:00.000Z",
	voyageIds: [],
} satisfies typeof agentReading.Row.Type;

const crewed = (id: string, createdAt: string, currentSessionId: string | null) => ({
	...crewMember,
	createdAt,
	currentSessionId,
	id: AgentId.make(id),
});

it("reads the newest agent of a piece that holds a conversation", () => {
	const older = crewed("older", "2026-09-01T00:00:00.000Z", "the open conversation");
	const newest = crewed("newest", "2026-09-02T00:00:00.000Z", null);
	expect(crewing([newest, older])?.currentSessionId).toBe("the open conversation");
	expect(crewing([older, newest])?.currentSessionId).toBe("the open conversation");
	expect(crewing([newest, crewed("newer", "2026-09-03T00:00:00.000Z", "the newer conversation")])?.currentSessionId).toBe("the newer conversation");
	expect(crewing([newest])).toBeUndefined();
});
