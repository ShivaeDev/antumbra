import { type DraftRef, DraftSnapshot, type ShellBridge } from "@antumbra/platform-shell/bridge.ts";
import { defaultConsole, WindowPlace } from "@antumbra/platform-shell/windows.ts";
import { Result, Schema } from "effect";
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

const EMPTY: DraftSnapshot = { revision: "", text: "" };

const decodePlace = Schema.decodeUnknownResult(Schema.fromJsonString(WindowPlace));
const encodePlace = Schema.encodeSync(Schema.fromJsonString(WindowPlace));
const decodeSnapshot = Schema.decodeUnknownResult(Schema.fromJsonString(DraftSnapshot));
const encodeSnapshot = Schema.encodeSync(Schema.fromJsonString(DraftSnapshot));

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
	target.search = new URLSearchParams({ place: encodePlace(place), port: String(link.port), token: link.token }).toString();
	return target.toString();
};

const keyOf = (ref: DraftRef): string => `antumbra/draft/${encodeURIComponent(ref.sessionId)}/${encodeURIComponent(ref.slot)}`;

const snapshotOf = (raw: string | null): DraftSnapshot => {
	const decoded = decodeSnapshot(raw);
	return Result.isFailure(decoded) ? EMPTY : decoded.success;
};

const chromeOf = (agent: string): string => /Chrome\/([\d.]+)/.exec(agent)?.[1] ?? "";

export const browserBridge = (location: Address): ShellBridge | undefined => {
	const link = linkOf(location);
	if (link === undefined) {
		return undefined;
	}
	const read = (ref: DraftRef): DraftSnapshot => snapshotOf(localStorage.getItem(keyOf(ref)));
	const write = (ref: DraftRef, text: string): DraftSnapshot => {
		const snapshot = { revision: crypto.randomUUID(), text };
		localStorage.setItem(keyOf(ref), encodeSnapshot(snapshot));
		return snapshot;
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
		appInfo: () => Promise.resolve({ chromeVersion: chromeOf(navigator.userAgent), electronVersion: "", nodeVersion: "", productVersion: version }),
		openExternal: (url) => {
			window.open(url);
		},
		readDraft: (ref) => Promise.resolve(read(ref)),
		writeDraft: (ref, text) => Promise.resolve(write(ref, text)),
		clearDraft: (ref, revision) => {
			if (read(ref).revision === revision) {
				write(ref, "");
			}
			return Promise.resolve();
		},
		subscribeDraft: (ref, listener) => {
			const key = keyOf(ref);
			const receive = (event: StorageChange) => {
				if (event.key === key) {
					listener(snapshotOf(event.newValue));
				}
			};
			window.addEventListener("storage", receive);
			return () => {
				window.removeEventListener("storage", receive);
			};
		},
	} satisfies ShellBridge;
};
