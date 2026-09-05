import type { VoyageCaptainView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CaptainCall } from "#views/voyage-acts.tsx";

const stoodDown: VoyageCaptainView = {
	agentId: "agent-1",
	atWork: false,
	sessionId: "session-1",
	status: "alive",
};

const render = (captain: VoyageCaptainView | null) =>
	renderToStaticMarkup(<CaptainCall captain={captain} onError={() => undefined} voyageId="voyage-1" />);

it("shows the captain at work instead of offering another call", () => {
	const html = render({ ...stoodDown, atWork: true });
	expect(html).toContain("agent-1");
	expect(html).not.toContain("Hail");
	expect(html).not.toContain("Wake");
});

it("offers to wake a captain at rest", () => {
	expect(render(stoodDown)).toContain("Wake the captain");
});

it("offers to hail when the voyage has no captain", () => {
	expect(render(null)).toContain("Hail a captain");
});
