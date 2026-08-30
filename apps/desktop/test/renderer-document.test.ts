import { expect, it } from "@effect/vitest";
import { selectRendererDocument } from "#adapters/renderer-document.ts";

const bundled = "file:///app/renderer/index.html";

it("selects bundled content for packaged builds", () => {
	expect(selectRendererDocument({ arguments: ["--renderer-url=http://localhost:5183"], bundled, isPackaged: true })).toBe(bundled);
});

it("selects the document supplied by the dev launcher", () => {
	expect(selectRendererDocument({ arguments: ["--renderer-url=http://localhost:5183"], bundled, isPackaged: false })).toBe("http://localhost:5183");
	expect(selectRendererDocument({ arguments: [], bundled, isPackaged: false })).toBe(bundled);
});
