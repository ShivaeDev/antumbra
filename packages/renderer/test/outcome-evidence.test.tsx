import type { ChangeView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ChangeLink } from "#views/change-chip.tsx";

const change: ChangeView = {
	activityAt: "2026-08-18T09:00:00.000Z",
	checks: "green",
	externalId: "42",
	host: "github",
	id: "change-42",
	isDraft: false,
	mergeable: "clean",
	observedAt: "2026-08-18T09:00:00.000Z",
	repoId: "repo-antumbra",
	repoName: "antumbra",
	review: "approved",
	stage: "open",
	title: "Confine privileged navigation",
	url: "https://github.com/example/antumbra/pull/42",
};

it("renders host-derived Change URLs as inert evidence", () => {
	const html = renderToStaticMarkup(<ChangeLink change={change} />);

	expect(html).toContain("Confine privileged navigation");
	expect(html).not.toContain("<a");
	expect(html).not.toContain("href=");
});
