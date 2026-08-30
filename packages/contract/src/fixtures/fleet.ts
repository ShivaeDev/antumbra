import type { AppInfo } from "#app-info.ts";
import type { Fleet } from "#fleet.ts";

export const info: AppInfo = {
	chromeVersion: "138.0.0.0",
	electronVersion: "43.3.0",
	nodeVersion: "22.21.0",
	productVersion: "0.0.0",
};

export const fleet: Fleet = {
	agents: [
		{
			berths: [
				{
					branch: "work/agent-1/reef",
					reclaimState: null,
					slug: "reef",
					status: "ready",
				},
			],
			canRetire: false,
			charter: "chart the reef",
			diag: { currentSessionId: "session-1", intents: [] },
			id: "agent-1",
			role: "navigator",
			sessions: [
				{
					addressable: [
						{
							changeId: "change-1",
							reference: "#42",
							situation: "merge_conflicts",
						},
					],
					backend: "claude",
					canAttachImages: false,
					canInterrupt: true,
					canSend: true,
					canSleep: false,
					cwd: "/tmp/reef",
					diag: { current: true, execution: "active", intents: [] },
					presence: "working",
					id: "session-1",
					status: "open",
				},
			],
			status: "alive",
		},
	],
	backends: ["claude"],
	capacities: [
		{
			backend: "claude",
			detail: null,
			reason: null,
			resetsAt: null,
			status: "available",
			utilization: null,
		},
	],
	diag: { intents: [] },
	repos: [
		{ defaultRef: "main", id: "repo-1", name: "shoals", source: "/tmp/shoals" },
	],
};
