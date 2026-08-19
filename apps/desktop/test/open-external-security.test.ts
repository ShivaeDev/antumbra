import { describe, expect, it } from "@effect/vitest";
import {
	type DocumentContents,
	makeMainDocumentAuthority,
} from "#adapters/main-document-authority.ts";
import {
	browsableUrl,
	makeOpenExternalHandler,
} from "#adapters/open-external.ts";

const PULL = "https://github.com/example/antumbra/pull/42";

const contents = (id: string): DocumentContents => {
	const frame = { url: `file:///app/${id}.html` };
	return {
		getURL: () => frame.url,
		isDestroyed: () => false,
		mainFrame: frame,
	};
};

const eventFor = (sender: DocumentContents) => ({
	sender,
	senderFrame: sender.mainFrame,
});

describe("external link policy", () => {
	it("hands the browser only web addresses it can parse", () => {
		expect(browsableUrl(PULL)).toBe(PULL);
		expect(browsableUrl("http://localhost:4173/board")).toBe(
			"http://localhost:4173/board",
		);

		for (const refused of [
			"file:///Users/admiral/.ssh/id_ed25519",
			"javascript:alert(document.cookie)",
			"vscode://file/etc/hosts",
			"mailto:admiral@example.com",
			"//github.com/example",
			"not an address",
			"",
			42,
			null,
			undefined,
		]) {
			expect(browsableUrl(refused), String(refused)).toBeUndefined();
		}
	});

	it("opens nothing for a sender that is not the owned document", () => {
		const authority = makeMainDocumentAuthority();
		const owned = contents("owned");
		const foreign = contents("foreign");
		authority.own(owned, owned.mainFrame.url);
		const opened: string[] = [];
		const handler = makeOpenExternalHandler(authority, (url) => {
			opened.push(url);
		});

		handler(eventFor(foreign), PULL);
		expect(opened).toEqual([]);

		handler(eventFor(owned), PULL);
		expect(opened).toEqual([PULL]);
	});
});
