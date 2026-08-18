import {
	decodeStoredAgentSessionStatus,
	decodeStoredAgentStatus,
	decodeStoredBerthStatus,
	decodeStoredMoorageStatus,
} from "@antumbra/vocabulary/agent-runtime";
import { expect, it } from "@effect/vitest";
import { Result } from "effect";

it("decodes every known runtime status through its owning vocabulary", () => {
	expect(decodeStoredAgentStatus("agent-1", "retired")).toEqual(
		Result.succeed("retired"),
	);
	expect(decodeStoredAgentSessionStatus("session-1", "closed")).toEqual(
		Result.succeed("closed"),
	);
	expect(decodeStoredMoorageStatus("agent-1", "provisioning")).toEqual(
		Result.succeed("provisioning"),
	);
	expect(decodeStoredBerthStatus("berth-1", "reclaimed")).toEqual(
		Result.succeed("reclaimed"),
	);
});

it("retains the exact subject and unknown stored word in typed failures", () => {
	expect(decodeStoredAgentStatus("agent-1", "future-agent")).toMatchObject({
		failure: {
			_tag: "StoredAgentStatusInvalid",
			agentId: "agent-1",
			value: "future-agent",
		},
	});
	expect(
		decodeStoredAgentSessionStatus("session-1", "future-session"),
	).toMatchObject({
		failure: {
			_tag: "StoredAgentSessionStatusInvalid",
			sessionId: "session-1",
			value: "future-session",
		},
	});
	expect(decodeStoredMoorageStatus("agent-1", "future-moorage")).toMatchObject({
		failure: {
			_tag: "StoredMoorageStatusInvalid",
			agentId: "agent-1",
			value: "future-moorage",
		},
	});
	expect(decodeStoredBerthStatus("berth-1", "future-berth")).toMatchObject({
		failure: {
			_tag: "StoredBerthStatusInvalid",
			berthId: "berth-1",
			value: "future-berth",
		},
	});
});
