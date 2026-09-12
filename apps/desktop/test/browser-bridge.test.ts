import type { ShellBridge } from "@antumbra/platform-shell/bridge.ts";
import { defaultConsole } from "@antumbra/platform-shell/windows.ts";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { afterEach, vi } from "vitest";
import { browserBridge } from "#browser/bridge.ts";
import { transcriptPlace } from "#test/windows.ts";

interface StorageChange {
	readonly key: string | null;
	readonly newValue: string | null;
}

const LINK = "http://localhost:5183/?port=41267&token=a-dev-token";
const REF = { sessionId: "session-1", slot: "message" };

const opened: string[] = [];
const stored = new Map<string, string>();
const listeners: ((event: StorageChange) => void)[] = [];

const browser = () => {
	vi.stubGlobal("localStorage", {
		getItem: (key: string) => stored.get(key) ?? null,
		setItem: (key: string, value: string) => {
			stored.set(key, value);
		},
	});
	vi.stubGlobal("window", {
		addEventListener: (_name: string, receive: (event: StorageChange) => void) => {
			listeners.push(receive);
		},
		removeEventListener: (_name: string, receive: (event: StorageChange) => void) => {
			listeners.splice(listeners.indexOf(receive), 1);
		},
		open: (address: string) => {
			opened.push(address);
		},
	});
};

const bridgeAt = (address: string): ShellBridge => browserBridge(new URL(address)) ?? expect.unreachable(`${address} carries a port and a token`);

afterEach(() => {
	opened.length = 0;
	listeners.length = 0;
	stored.clear();
	vi.unstubAllGlobals();
});

it("refuses a page that does not carry the port, the token and a readable place", () => {
	expect(browserBridge(new URL("http://localhost:5183/"))).toBeUndefined();
	expect(browserBridge(new URL("http://localhost:5183/?port=41267"))).toBeUndefined();
	expect(browserBridge(new URL("http://localhost:5183/?token=a-dev-token"))).toBeUndefined();
	expect(browserBridge(new URL(`${LINK}&place=not-a-place`))).toBeUndefined();
});

it.effect("serves the port and token the page carries and opens the console when it names no place", () =>
	Effect.gen(function* () {
		const bridge = bridgeAt(LINK);
		expect(yield* Effect.promise(() => bridge.server())).toEqual({ port: 41267, token: "a-dev-token" });
		expect(yield* Effect.promise(() => bridge.windowPlace())).toEqual(defaultConsole);
	}),
);

it.effect("opens another window as a tab that reaches the same server and lands in the asked-for place", () =>
	Effect.gen(function* () {
		browser();
		const place = transcriptPlace("session-1");
		yield* Effect.promise(() => bridgeAt(LINK).openWindow(place));
		const tab = new URL(opened[0] ?? "");
		expect(`${tab.origin}${tab.pathname}`).toBe("http://localhost:5183/");
		const opening = bridgeAt(tab.href);
		expect(yield* Effect.promise(() => opening.server())).toEqual({ port: 41267, token: "a-dev-token" });
		expect(yield* Effect.promise(() => opening.windowPlace())).toEqual(place);
	}),
);

it.effect("keeps a later draft edit when an earlier send clears the slot it no longer holds", () =>
	Effect.gen(function* () {
		browser();
		const bridge = bridgeAt(LINK);
		expect(yield* Effect.promise(() => bridge.readDraft(REF))).toEqual({ revision: "", text: "" });
		const first = yield* Effect.promise(() => bridge.writeDraft(REF, "first draft"));
		const later = yield* Effect.promise(() => bridge.writeDraft(REF, "later edit"));
		yield* Effect.promise(() => bridge.clearDraft(REF, first.revision));
		expect(yield* Effect.promise(() => bridge.readDraft(REF))).toEqual(later);
		yield* Effect.promise(() => bridge.clearDraft(REF, later.revision));
		expect((yield* Effect.promise(() => bridge.readDraft(REF))).text).toBe("");
	}),
);

it("tells a watching tab what another tab wrote to the same slot, and stops when it lets go", () => {
	browser();
	const seen: string[] = [];
	const stop = bridgeAt(LINK).subscribeDraft(REF, (snapshot) => seen.push(snapshot.text));
	const written = JSON.stringify({ revision: "r-1", text: "from the other tab" });
	for (const receive of listeners) {
		receive({ key: "antumbra/draft/session-1/reply", newValue: written });
		receive({ key: "antumbra/draft/session-1/message", newValue: written });
	}
	expect(seen).toEqual(["from the other tab"]);
	stop();
	expect(listeners).toHaveLength(0);
});
