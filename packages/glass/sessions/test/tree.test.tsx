import { press, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { expect } from "vitest";
import { SessionTreePanel } from "#session-tree.tsx";

it.glass("delegated work appears from runner evidence and opens its transcript", function* ({ api, render, run }) {
	const sessionId = "session";
	const runner = yield* run(connectRunner({ runnerId: "runner", logId: "runner-log", backends: ["scripted"], imageInputBackends: [] }));
	yield* runner.append([
		{
			logId: "runner-log",
			cursor: 0,
			at: 100,
			event: {
				type: "SessionStarted",
				sessionId,
				requestId: "start",
				agentId: "agent",
				backend: "scripted",
				cwd: "/berth",
				nativeRef: "native",
				runnerId: "runner",
				toolSetVersion: "tools",
			},
		},
	]);
	let selected = "";
	const container = yield* render(
		<SessionTreePanel
			api={api}
			sessionId={sessionId}
			selected={sessionId}
			onSelect={(id) => {
				selected = id;
			}}
		/>,
	);
	yield* runner.append([
		{
			logId: "runner-log",
			cursor: 1,
			at: 101,
			event: {
				type: "ProviderEvent",
				sessionId,
				event: {
					type: "subsession.opened",
					subsessionRef: "child",
					spawnedBy: "spawn",
					label: "Explorer",
					kind: "task",
					raw: { kind: "subsession", source: "scripted", payload: "{}" },
				},
			},
		},
	]);
	yield* until(() => container.textContent?.includes("Delegated work") === true, "delegated work arrives");
	yield* press(container, "Delegated work");
	yield* press(container, "ExplorerOpen");
	expect(selected).not.toBe("");
	expect(selected).not.toBe(sessionId);
});
