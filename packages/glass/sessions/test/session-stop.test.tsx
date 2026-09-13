import { press, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";
import { SessionHeader } from "#session-header.tsx";

const CREW = Request.make("agent:glass-stop");
const LOG = "log:glass-stop";
const RUNNER = "runner:glass-stop";

const named = (container: HTMLElement, text: string): boolean =>
	[...container.querySelectorAll("button")].some((button) => button.textContent?.trim() === text);

it.glass("the act on a working session reads Stop and leaves the session held", function* ({ api, render, run }) {
	const runner = yield* run(connectRunner({ runnerId: RUNNER, logId: LOG, backends: ["claude"], imageInputBackends: [] }));
	yield* api.agents.spawn({ requestId: CREW, role: "hand", backend: "claude", model: null, effort: null });
	const { agentId, sessionId } = identity(CREW);
	yield* run(
		runner.append([
			{
				logId: LOG,
				cursor: 0,
				at: 0,
				event: {
					type: "SessionStarted",
					requestId: CREW,
					sessionId,
					agentId,
					backend: "claude",
					cwd: "/berth",
					nativeRef: "native",
					runnerId: RUNNER,
					toolSetVersion: "1",
				},
			},
			{ logId: LOG, cursor: 1, at: 1, event: { type: "InputAccepted", requestId: CREW, sessionId, inputId: "charter" } },
		]),
	);
	const container = yield* render(<SessionHeader api={api} nodeId={sessionId} sessionId={sessionId} snapshot={undefined} />);
	yield* until(() => named(container, "Stop"), "the stop act to reach the header");
	expect(named(container, "Interrupt")).toBe(false);
	yield* press(container, "Stop");
	yield* until(() => container.textContent?.includes("stopped by you") === true, "the chip to say the session is held");
	expect(named(container, "Stop")).toBe(false);
});
