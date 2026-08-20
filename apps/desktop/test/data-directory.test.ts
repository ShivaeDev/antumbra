import { join } from "node:path";
import { expect, it } from "@effect/vitest";
import { selectDataDirectory } from "#adapters/shell.ts";

const appData = "/home/pilot/Library/Application Support";

it("keeps packaged builds on the installed directory", () => {
	for (const devOverride of [undefined, "/tmp/isolated", "relative/path", ""]) {
		expect(
			selectDataDirectory({ appData, devOverride, isPackaged: true }),
		).toBe(join(appData, "Antumbra"));
	}
});

it("keeps unconfigured dev runs on the shared dev directory", () => {
	for (const devOverride of [undefined, ""]) {
		expect(
			selectDataDirectory({ appData, devOverride, isPackaged: false }),
		).toBe(join(appData, "Antumbra-Dev"));
	}
});

it("gives a configured dev run its own directory", () => {
	expect(
		selectDataDirectory({
			appData,
			devOverride: "/tmp/antumbra-instances/two",
			isPackaged: false,
		}),
	).toBe("/tmp/antumbra-instances/two");
});

it("refuses a dev override that is not an absolute path", () => {
	expect(() =>
		selectDataDirectory({
			appData,
			devOverride: "instances/two",
			isPackaged: false,
		}),
	).toThrow("ANTUMBRA_DEV_USER_DATA must be an absolute path");
});
