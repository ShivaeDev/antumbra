import { SETTINGS } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ModeNav } from "#views/mode-nav.tsx";
import { SettingRow } from "#views/setting-row.tsx";
import { SettingsPanel } from "#views/settings.tsx";

it("offers Settings in the established console navigation", () => {
	const html = renderToStaticMarkup(<ModeNav mode="fleet" onMode={() => undefined} />);
	expect(html).toContain("Settings");
});

it("says nothing about a setting until the reading arrives", () => {
	const html = renderToStaticMarkup(<SettingsPanel onError={() => undefined} onSettings={() => undefined} settings={undefined} />);
	expect(html).toContain("Reading settings…");
	expect(html).not.toContain(SETTINGS.retireSweep.title);
});

it("draws a declared flag as a checkbox and names the catalog's own value", () => {
	const html = renderToStaticMarkup(<SettingRow onChange={() => undefined} overridden={false} settingKey="retireSweep" value={true} />);
	expect(html).toContain(SETTINGS.retireSweep.title);
	expect(html).toContain(SETTINGS.retireSweep.description);
	expect(html).toContain('type="checkbox"');
	expect(html).toContain("own value. Expects true or false.");
});

it("draws the idle siesta wait as a bounded number field", () => {
	const html = renderToStaticMarkup(<SettingRow onChange={() => undefined} overridden={true} settingKey="idleSiestaMinutes" value={90} />);
	expect(html).toContain(SETTINGS.idleSiestaMinutes.title);
	expect(html).toContain(SETTINGS.idleSiestaMinutes.description);
	expect(html).toContain('type="number"');
	expect(html).toContain(`min="${SETTINGS.idleSiestaMinutes.least}"`);
	expect(html).toContain(`max="${SETTINGS.idleSiestaMinutes.most}"`);
	expect(html).toContain('value="90"');
	expect(html).toContain("own value is 60.");
	expect(html).toContain("Set by you.");
});

it("offers no save for a count still showing the value it was given", () => {
	const html = renderToStaticMarkup(
		<SettingRow onChange={() => undefined} overridden={false} settingKey="maxParallelSessions" value={SETTINGS.maxParallelSessions.fallback} />,
	);
	expect(html).toContain("disabled");
});
