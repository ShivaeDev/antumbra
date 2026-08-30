import type { ConsoleMode } from "@antumbra/contract";
import { flagshipSummary } from "@antumbra/contract/fixtures";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ConsoleMain } from "#views/console-main.tsx";

vi.mock("#views/quay.tsx", () => ({
	QuayPanel: ({ selectedId }: { readonly selectedId: string | undefined }) => <section>pull request {selectedId}</section>,
}));

vi.mock("#views/rulings.tsx", () => ({
	RulingsPanel: () => <section>open rulings</section>,
}));

const render = (mode: ConsoleMode): string =>
	renderToStaticMarkup(
		<ConsoleMain
			change="change-7"
			fleet={undefined}
			mode={mode}
			onChange={() => undefined}
			onError={() => undefined}
			onPiece={() => undefined}
			onSession={() => undefined}
			onSettings={() => undefined}
			onVoyage={() => undefined}
			piece={undefined}
			session={undefined}
			settings={undefined}
			voyage={undefined}
			voyages={[
				flagshipSummary,
				{
					captain: null,
					captainBackend: "codex",
					counts: { active: 0, done: 0, pieces: 0, ready: 0 },
					crewBackend: "codex",
					focusedAt: null,
					id: "voyage-1",
					kind: "voyage",
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

it("gives Rulings the whole workspace without the voyage rail", () => {
	const markup = render("rulings");

	expect(markup).toContain("open rulings");
	expect(markup).not.toContain("Unrelated voyage");
	expect(markup).not.toContain("<aside");
});

it("gives the flagship the whole workspace without the voyage rail", () => {
	const markup = render("flagship");

	expect(markup).toContain("the flagship captain has no conversation open yet");
	expect(markup).not.toContain("Unrelated voyage");
	expect(markup).not.toContain("<aside");
});

it("keeps the voyage rail on the actual Voyages page", () => {
	const markup = render("voyages");

	expect(markup).toContain("Unrelated voyage");
	expect(markup).toContain("<aside");
});
