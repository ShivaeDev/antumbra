import { expect, it } from "@effect/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FleetPanel } from "#views/fleet.tsx";

const renderFleet = (canInterrupt: boolean, executionStatus: string) => {
	const fleet = {
		agents: [
			{
				berths: [],
				charter: "chart the reef",
				id: "agent-1",
				role: "navigator",
				sessions: [
					{
						backend: "scripted",
						canInterrupt,
						cwd: "/tmp/reef",
						executionStatus,
						id: "session-1",
						posture: executionStatus,
						status: "open",
					},
				],
				status: "alive",
			},
		],
		backends: ["scripted"],
		repos: [],
	};
	return renderToStaticMarkup(
		<FleetPanel
			fleet={fleet}
			onError={() => undefined}
			onSelect={() => undefined}
			selected={undefined}
		/>,
	);
};

it("offers interrupt only when the public capability allows it", () => {
	const interruptible = renderFleet(true, "active");
	const idle = renderFleet(false, "idle");
	expect(interruptible).toContain("interrupt");
	expect(idle).not.toContain("interrupt");
	expect(interruptible).not.toContain("active");
	expect(idle).not.toContain("idle");
});
