import type { Fleet } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FleetPanel } from "#views/fleet.tsx";

const renderFleet = (canInterrupt: boolean) => {
	const fleet: Fleet = {
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
						canSend: canInterrupt,
						cwd: "/tmp/reef",
						id: "session-1",
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
	expect(renderFleet(true)).toContain("interrupt");
	expect(renderFleet(false)).not.toContain("interrupt");
});
