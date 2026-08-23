import type { ConsoleMode } from "@antumbra/contract";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ConsoleMain } from "#views/console-main.tsx";

vi.mock("#views/quay.tsx", () => ({
	QuayPanel: ({ selectedId }: { readonly selectedId: string | undefined }) => (
		<section>pull request {selectedId}</section>
	),
}));

const render = (mode: ConsoleMode): string =>
	renderToStaticMarkup(
		<ConsoleMain
			change="change-7"
			fleet={undefined}
			mode={mode}
			onChange={() => undefined}
			onError={() => undefined}
			onSession={() => undefined}
			onVoyage={() => undefined}
			session={undefined}
			voyage={undefined}
			voyages={[
				{
					backend: "codex",
					captain: null,
					counts: { active: 0, done: 0, pieces: 0, ready: 0 },
					focusedAt: null,
					id: "voyage-1",
					name: "Unrelated voyage",
					northStar: "not part of quay navigation",
					state: "quiet",
				},
			]}
		/>,
	);

it("gives Quay the whole workspace without the voyage rail", () => {
	const markup = render("quay");

	expect(markup).toContain("pull request change-7");
	expect(markup).not.toContain("Unrelated voyage");
	expect(markup).not.toContain("<aside");
});

it("keeps the voyage rail on the actual Voyages page", () => {
	const markup = render("voyages");

	expect(markup).toContain("Unrelated voyage");
	expect(markup).toContain("<aside");
});
