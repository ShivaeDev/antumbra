import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { ModeNav } from "#views/mode-nav.tsx";
import { SettingRow } from "#views/setting-row.tsx";
import { SettingsPanel } from "#views/settings.tsx";

it("offers Settings in the established console navigation", () => {
	const html = renderToStaticMarkup(<ModeNav held={false} mode="fleet" onMode={() => undefined} />);
	expect(html).toContain("Settings");
});

it("says nothing about a setting until the reading arrives", () => {
	const html = renderToStaticMarkup(<SettingsPanel fleet={undefined} onError={() => undefined} onSettings={() => undefined} settings={undefined} />);
	expect(html).toContain("Reading settings…");
	expect(html).not.toContain("Retire rested agents");
});

it("draws a flag as a checkbox with its value status", () => {
	const html = renderToStaticMarkup(<SettingRow onChange={() => undefined} overridden={false} settingKey="retireSweep" value={true} />);
	expect(html).toContain("Retire rested agents");
	expect(html).toContain("Retire agents that have rested longer than the threshold.");
	expect(html).toContain('type="checkbox"');
	expect(html).toContain("own value. Expects true or false.");
});

it("draws the idle siesta wait as a bounded number field", () => {
	const html = renderToStaticMarkup(<SettingRow onChange={() => undefined} overridden={true} settingKey="idleSiestaMinutes" value={90} />);
	expect(html).toContain('type="number"');
	expect(html).toContain('min="1"');
	expect(html).toContain('max="1440"');
	expect(html).toContain('value="90"');
	expect(html).toContain("own value is 60.");
	expect(html).toContain("Set by you.");
});

it("offers no save for a count still showing the value it was given", () => {
	const html = renderToStaticMarkup(<SettingRow onChange={() => undefined} overridden={false} settingKey="maxParallelSessions" value={4} />);
	expect(html).toContain("disabled");
});

it.effect(
	"keeps a count draft until its persisted value changes",
	Effect.fnUntraced(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		const settle = (change: () => void) =>
			Effect.promise(() =>
				act(() => {
					change();
					return Promise.resolve();
				}),
			);
		const render = (value: number) =>
			settle(() => root.render(<SettingRow onChange={() => undefined} overridden={true} settingKey="maxParallelSessions" value={value} />));
		yield* Effect.addFinalizer(() => settle(() => root.unmount()));
		yield* render(4);
		const input = container.querySelector("input");
		expect(input?.value).toBe("4");
		yield* settle(() => {
			Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "6");
			input?.dispatchEvent(new Event("input", { bubbles: true }));
		});
		yield* render(4);
		expect(container.querySelector("input")?.value).toBe("6");
		expect(container.querySelector("button")?.disabled).toBe(false);
		yield* render(8);
		expect(container.querySelector("input")?.value).toBe("8");
		expect(container.querySelector("button")?.disabled).toBe(true);
	}),
);
