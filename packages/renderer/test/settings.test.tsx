import { expect, it } from "@effect/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ModeNav } from "#views/mode-nav.tsx";
import { SettingsPanel } from "#views/settings.tsx";

it("offers Settings in the established console navigation", () => {
	const html = renderToStaticMarkup(
		<ModeNav mode="fleet" onMode={() => undefined} />,
	);
	expect(html).toContain("Settings");
});

it("explains the live bounded parallel-session setting", () => {
	const html = renderToStaticMarkup(
		<SettingsPanel onError={() => undefined} />,
	);
	expect(html).toContain("Maximum parallel sessions");
	expect(html).toContain("Enter a whole number from 1 to 64.");
	expect(html).toContain("Running sessions are not interrupted");
	expect(html).toContain("disabled");
});
