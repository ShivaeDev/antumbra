import { expect, it } from "@effect/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FleetPanel } from "#views/fleet.tsx";

it("offers interrupt without rendering internal Session execution state", () => {
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
						canInterrupt: true,
						cwd: "/tmp/reef",
						executionStatus: "active",
						id: "session-1",
						posture: "active",
						status: "open",
					},
				],
				status: "alive",
			},
		],
		backends: ["scripted"],
		repos: [],
	};
	const markup = renderToStaticMarkup(
		<FleetPanel
			fleet={fleet}
			onError={() => undefined}
			onSelect={() => undefined}
			selected={undefined}
		/>,
	);
	expect(markup).toContain("interrupt");
	expect(markup).not.toContain("active");
});
