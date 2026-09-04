import { describe, expect, it } from "@effect/vitest";
import { openWebLink } from "#adapters/open-external.ts";
import { guardWindow, type WindowGuardHost } from "#adapters/windows/guard.ts";

type OpenHandler = Parameters<WindowGuardHost["setWindowOpenHandler"]>[0];
type NavigationListener = Parameters<WindowGuardHost["onWillNavigate"]>[0];

const BUNDLED = "file:///Applications/Antumbra.app/Contents/Resources/renderer/index.html";
const DEV = "http://localhost:5173/";
const PULL = "https://github.com/example/antumbra/pull/42";
const DOCS = "http://localhost:4321/design/";

const guarded = (document: string) => {
	const opened: string[] = [];
	let openWindow: OpenHandler | undefined;
	let navigate: NavigationListener | undefined;
	guardWindow(
		{
			onWillNavigate: (listener) => {
				navigate = listener;
			},
			setWindowOpenHandler: (handler) => {
				openWindow = handler;
			},
		},
		document,
		openWebLink((url) => {
			opened.push(url);
		}),
	);
	return {
		navigateTo: (url: string): "allowed" | "prevented" => {
			let outcome: "allowed" | "prevented" = "allowed";
			navigate?.({
				preventDefault: () => {
					outcome = "prevented";
				},
				url,
			});
			return outcome;
		},
		open: (url: string) => openWindow?.({ url }).action,
		opened,
	};
};

describe("window guard", () => {
	it("denies every new window and hands web links to the browser", () => {
		const window = guarded(BUNDLED);

		expect(window.open(PULL)).toBe("deny");
		expect(window.open("file:///etc/hosts")).toBe("deny");
		expect(window.open("javascript:alert(1)")).toBe("deny");
		expect(window.opened).toEqual([PULL]);
	});

	it("keeps a bundled document on its own file", () => {
		const window = guarded(BUNDLED);

		expect(window.navigateTo(BUNDLED)).toBe("allowed");
		expect(window.navigateTo(`${BUNDLED}#/voyages`)).toBe("allowed");
		expect(window.navigateTo("file:///Applications/Antumbra.app/Contents/Resources/renderer/other.html")).toBe("prevented");
		expect(window.navigateTo(PULL)).toBe("prevented");
		expect(window.opened).toEqual([PULL]);
	});

	it("keeps a dev document on its own origin", () => {
		const window = guarded(DEV);

		expect(window.navigateTo(DEV)).toBe("allowed");
		expect(window.navigateTo("http://localhost:5173/voyages?tab=board")).toBe("allowed");
		expect(window.navigateTo(DOCS)).toBe("prevented");
		expect(window.opened).toEqual([DOCS]);
	});
});
