import { describe, expect, it } from "vitest";
import { layoutPreloadViolations } from "#lint/rules/layout-preload.ts";
import { inventoryOf } from "#test/support/inventory.ts";

const check = (path: string, content: string) => layoutPreloadViolations(inventoryOf({ sources: [{ content, path }] })).map(({ message }) => message);

describe("preload-carries-only-electron rule", () => {
	it("lets a preload carry electron, the channel names and types", () => {
		expect(
			check(
				"apps/desktop/src/adapters/preload.ts",
				'import type { ShellBridge } from "@antumbra/platform-shell/bridge.ts";\nimport { type DraftRef, type DraftSnapshot } from "@antumbra/platform-shell/bridge.ts";\nimport * as Channel from "@antumbra/platform-shell/channels.ts";\nimport { contextBridge } from "electron";\nexport {};\n',
			),
		).toEqual([]);
		expect(check("apps/desktop/src/preload.ts", 'import { installShellBridge } from "#adapters/preload.ts";\nexport {};\n')).toEqual([]);
	});

	it("refuses a runtime import in the preload", () => {
		expect(check("apps/desktop/src/adapters/preload.ts", 'import { Schema } from "effect";\nexport {};\n')).toEqual([
			"apps/desktop/src/adapters/preload.ts may not import effect at runtime: Electron runs a sandboxed preload inside its own script, so it carries only electron, the channel names and types.",
		]);
		expect(check("apps/desktop/src/preload.ts", 'import { Serving } from "@antumbra/platform-shell/bridge.ts";\nexport {};\n')).toEqual([
			"apps/desktop/src/preload.ts may not import @antumbra/platform-shell/bridge.ts at runtime: Electron runs a sandboxed preload inside its own script, so it carries only electron, the channel names and types.",
		]);
	});

	it("leaves every other file alone", () => {
		expect(check("apps/desktop/src/adapters/shell-bridge.ts", 'import { Schema } from "effect";\nexport {};\n')).toEqual([]);
	});
});
