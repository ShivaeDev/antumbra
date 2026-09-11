import { expect, it } from "@effect/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ModeNav } from "#views/mode-nav.tsx";

it("offers Settings in the established console navigation", () => {
	const html = renderToStaticMarkup(<ModeNav held={false} mode="fleet" onMode={() => undefined} />);
	expect(html).toContain("Settings");
});
