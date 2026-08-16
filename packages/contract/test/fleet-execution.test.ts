import { expect, it } from "@effect/vitest";
import { Schema } from "effect";
import { Fleet } from "#sight.ts";

it("publishes interrupt capability without raw Session execution state", () => {
	const decoded = Schema.decodeUnknownSync(Fleet)({
		agents: [
			{
				berths: [],
				charter: "chart the reef",
				id: "agent-1",
				role: "navigator",
				sessions: [
					{
						backend: "scripted",
						canInterrupt: false,
						cwd: "/tmp/reef",
						executionStatus: "idle",
						id: "session-1",
						posture: "idle",
						status: "open",
					},
				],
				status: "alive",
			},
		],
		backends: ["scripted"],
		repos: [],
	});
	expect(decoded.agents[0]?.sessions[0]).toEqual({
		backend: "scripted",
		canInterrupt: false,
		cwd: "/tmp/reef",
		id: "session-1",
		status: "open",
	});
});
