import type { Fleet } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FleetPanel } from "#views/fleet.tsx";

const render = (fleet: Fleet): string =>
	renderToStaticMarkup(
		<FleetPanel
			fleet={fleet}
			onError={() => undefined}
			onSelect={() => undefined}
			selected={undefined}
		/>,
	);

const renderFleet = (canInterrupt: boolean, execution: string): string =>
	render({
		agents: [
			{
				berths: [],
				charter: "chart the reef",
				diag: { currentSessionId: "session-1", intents: [] },
				id: "agent-1",
				role: "navigator",
				sessions: [
					{
						backend: "scripted",
						canInterrupt,
						canSend: canInterrupt,
						cwd: "/tmp/reef",
						diag: { current: true, execution, intents: [] },
						id: "session-1",
						status: "open",
					},
				],
				status: "alive",
			},
		],
		backends: ["scripted"],
		diag: { intents: [] },
		repos: [],
	});

// why: the discipline this test has always guarded is that the interrupt
// affordance follows the published capability and nothing else. It still
// does — the raw execution word is now visible beside it as a diagnostic
// chip, and the executing-but-refused case is what proves the affordance
// never reads that word.
it("offers interrupt only when the public capability allows it", () => {
	expect(renderFleet(true, "active")).toContain("interrupt");
	expect(renderFleet(false, "idle")).not.toContain("interrupt");
	const stranded = renderFleet(false, "active");
	expect(stranded).not.toContain("interrupt");
	expect(stranded).toContain("active");
});

const recovering = { id: "intent-1", kind: "agent/recover", state: "waiting" };
const retiring = { id: "intent-2", kind: "agent/retire", state: "queued" };
const spawning = { id: "intent-3", kind: "agent/spawn", state: "queued" };

it("renders the raw execution and intent words as chips", () => {
	const markup = render({
		agents: [
			{
				berths: [],
				charter: "chart the reef",
				diag: { currentSessionId: null, intents: [retiring] },
				id: "agent-1",
				role: "navigator",
				sessions: [
					{
						backend: "scripted",
						canInterrupt: false,
						canSend: false,
						cwd: "/tmp/reef",
						diag: {
							current: false,
							execution: "draining",
							intents: [recovering],
						},
						id: "session-1",
						status: "open",
					},
				],
				status: "alive",
			},
		],
		backends: ["scripted"],
		diag: { intents: [spawning] },
		repos: [],
	});
	expect(markup).toContain("draining");
	expect(markup).toContain("intent: agent/recover waiting");
	expect(markup).toContain("intent: agent/retire queued");
	expect(markup).toContain("intent: agent/spawn queued");
	expect(markup).toContain("current none");
});
