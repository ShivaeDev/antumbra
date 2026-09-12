import { expect, it } from "@effect/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { card, soundings } from "#test/piece-card-fixture.tsx";

it("says who the piece is and where it stands in one line", () => {
	const shown = renderToStaticMarkup(card(soundings));

	expect(shown).toContain("soundings");
	expect(shown).toContain("hand");
	expect(shown).toContain("Held");
	expect(shown).toContain("Sound the shoals Take every depth");
});

it("previews a charter as words, never as the marks it was written with", () => {
	const shown = renderToStaticMarkup(card(soundings));

	expect(shown).not.toContain("# Sound");
	expect(shown).not.toContain("**");
	expect(shown).not.toContain("<h1");
	expect(shown).not.toContain("<li>");
});

it("holds the charter, the ladder and the acts until the card is opened", () => {
	const shown = renderToStaticMarkup(card(soundings));

	expect(shown).not.toContain("Depends on");
	expect(shown).not.toContain("Awaiting ruling");
	expect(shown).not.toContain("Launch");
	expect(shown).toContain('aria-expanded="false"');
});

it("keeps a charter inside the card however long its words run", () => {
	const path = "/Users/navigator/charts/packages/renderer/src/views/piece.tsx";
	const shown = renderToStaticMarkup(card({ ...soundings, charter: `- ${path}\n- ${path}` }));

	expect(shown).toContain(`${path} ${path}`);
	expect(shown).toContain("truncate");
});
