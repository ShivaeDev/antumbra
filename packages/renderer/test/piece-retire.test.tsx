import { soundings } from "@antumbra/contract/fixtures";
import { expect, it } from "@effect/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PieceRetire } from "#views/piece-retire.tsx";

const rendered = (canRetireCrew: boolean) => renderToStaticMarkup(<PieceRetire onError={() => undefined} piece={{ ...soundings, canRetireCrew }} />);

it("offers nothing while the domain withholds the capability", () => {
	expect(rendered(false)).toBe("");
});

it("offers the act once the domain says the crew may be released", () => {
	expect(rendered(true)).toContain("Retire crew");
});
