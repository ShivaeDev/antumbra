import type { AppInfo } from "#app-info.ts";
import type { Fleet, SessionEvent } from "#sight.ts";

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
			charter: "chart the reef",
			diag: { currentSessionId: "session-1", intents: [] },
			id: "agent-1",
			role: "navigator",
			sessions: [
				{
					backend: "claude",
					canInterrupt: true,
					canSend: true,
					cwd: "/tmp/reef",
					diag: { current: true, execution: "active", intents: [] },
					id: "session-1",
					status: "open",
				},
			],
			status: "alive",
		},
	],
	backends: ["claude"],
	diag: { intents: [] },
	repos: [
		{ defaultRef: "main", id: "repo-1", name: "shoals", source: "/tmp/shoals" },
	],
};

export const storedEvents: ReadonlyArray<SessionEvent> = [
	{
		event: { _tag: "Unknown", kind: "system/init", payload: "{}" },
		seq: 0,
		sessionId: "session-1",
	},
	{
		event: { _tag: "Unknown", kind: "assistant", payload: "{}" },
		seq: 1,
		sessionId: "session-1",
	},
];
