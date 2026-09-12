import { expect, it } from "@effect/vitest";
import { browserLink } from "#browser-link.ts";

const SERVING = { port: 41267, token: "a-dev-token" };

it("links to the renderer the dev app is showing and says nothing about a packaged one", () => {
	expect(browserLink("http://localhost:5183", SERVING)).toBe("http://localhost:5183/?port=41267&token=a-dev-token");
	expect(browserLink("file:///Applications/Antumbra.app/Contents/renderer/index.html", SERVING)).toBeUndefined();
});
