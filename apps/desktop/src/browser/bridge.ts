import type { DraftRef, ShellBridge } from "@antumbra/platform-shell/bridge.ts";
import { defaultConsole, WindowPlace } from "@antumbra/platform-shell/windows.ts";
import { Result, Schema } from "effect";
import { LegacyDraft, upgradeDraft } from "#adapters/draft-upgrade.ts";
import { version } from "#package.json";

export const needsTheLink = "Open this page from the browser link the running dev app logs, which carries the port and token it needs.";

interface Address {
	readonly origin: string;
	readonly pathname: string;
	readonly search: string;
}

interface Link {
	readonly place: WindowPlace;
	readonly port: number;
	readonly token: string;
}

interface StorageChange {
	readonly key: string | null;
	readonly newValue: string | null;
}

const draftChanges = new EventTarget();
const StorageChangeSchema = Schema.Struct({ key: Schema.NullOr(Schema.String), newValue: Schema.NullOr(Schema.String) });

const decodePlace = Schema.decodeUnknownResult(Schema.fromJsonString(WindowPlace));
const encodePlace = Schema.encodeSync(Schema.fromJsonString(WindowPlace));
const decodeSnapshot = Schema.decodeUnknownResult(Schema.fromJsonString(LegacyDraft));

const linkOf = (location: Address): Link | undefined => {
	const params = new URLSearchParams(location.search);
	const port = Number.parseInt(params.get("port") ?? "", 10);
	const token = params.get("token") ?? "";
	if (Number.isNaN(port) || token === "") {
		return undefined;
	}
	const raw = params.get("place");
	if (raw === null) {
		return { place: defaultConsole, port, token };
	}
	const decoded = decodePlace(raw);
	return Result.isFailure(decoded) ? undefined : { place: decoded.success, port, token };
};

const addressOf = (location: Address, link: Link, place: WindowPlace): string => {
	const target = new URL(location.pathname, location.origin);
	const params = new URLSearchParams(location.search);
	params.set("place", encodePlace(place));
	params.set("port", String(link.port));
	params.set("token", link.token);
	target.search = params.toString();
	return target.toString();
};

const keyOf = (ref: DraftRef): string => `antumbra/draft/${encodeURIComponent(ref.sessionId)}/${encodeURIComponent(ref.slot)}`;

const draftValue = (raw: string | null): string | null => {
	const decoded = decodeSnapshot(raw);
	return Result.isFailure(decoded) ? raw : upgradeDraft(decoded.success);
};

const chromeOf = (agent: string): string => /Chrome\/([\d.]+)/.exec(agent)?.[1] ?? "";

export const browserBridge = (location: Address): ShellBridge | undefined => {
	const link = linkOf(location);
	if (link === undefined) {
		return undefined;
	}
	const read = (ref: DraftRef): string | null => {
		const key = keyOf(ref);
		const raw = localStorage.getItem(key);
		const value = draftValue(raw);
		if (value !== raw) {
			if (value === null) localStorage.removeItem(key);
			else localStorage.setItem(key, value);
		}
		return value;
	};
	const write = (ref: DraftRef, value: string | null): void => {
		if (value === null) localStorage.removeItem(keyOf(ref));
		else localStorage.setItem(keyOf(ref), value);
		draftChanges.dispatchEvent(new CustomEvent("change", { detail: { key: keyOf(ref), newValue: value } }));
	};
	return {
		server: () => Promise.resolve({ port: link.port, token: link.token }),
		windowPlace: () => Promise.resolve(link.place),
		rememberPlace: () => Promise.resolve(),
		openWindow: (place) => {
			window.open(addressOf(location, link, place));
			return Promise.resolve();
		},
		restart: () => Promise.resolve(),
		restartServer: () => Promise.resolve(),
		appInfo: () => Promise.resolve({ chromeVersion: chromeOf(navigator.userAgent), electronVersion: "", nodeVersion: "", productVersion: version }),
		openExternal: (url) => {
			window.open(url);
		},
		readDraft: (ref) => Promise.resolve(read(ref)),
		writeDraft: (ref, value, expected) => {
			if (expected === undefined || read(ref) === expected) write(ref, value);
			return Promise.resolve();
		},
		clearDraft: (ref, expected) => {
			if (read(ref) === expected) {
				write(ref, null);
			}
			return Promise.resolve();
		},
		subscribeDraft: (ref, listener) => {
			const key = keyOf(ref);
			const receive = (event: StorageChange) => {
				if (event.key === key) {
					listener(draftValue(event.newValue));
				}
			};
			const local = (event: Event) => {
				if (event instanceof CustomEvent) receive(Schema.decodeUnknownSync(StorageChangeSchema)(event.detail));
			};
			window.addEventListener("storage", receive);
			draftChanges.addEventListener("change", local);
			return () => {
				window.removeEventListener("storage", receive);
				draftChanges.removeEventListener("change", local);
			};
		},
	} satisfies ShellBridge;
};
