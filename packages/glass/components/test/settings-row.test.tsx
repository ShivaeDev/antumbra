import { labelled } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { SettingsRow } from "#compositions/settings-row.tsx";

const row = <SettingsRow control={<input id="control" type="checkbox" />} help="What it does." htmlFor="control" label="A setting" labelId="named" />;

it.glass("names its control and carries its help", function* ({ render }) {
	const container = yield* render(row);
	expect(labelled(container, "A setting").id).toBe("control");
	expect(container.textContent).toContain("What it does.");
});
