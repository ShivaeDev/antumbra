import { type DraftRef, DraftSnapshot, type ShellBridge } from "@antumbra/platform-shell/bridge.ts";
import { Schema } from "effect";

const Metadata = Schema.Struct({ label: Schema.String, captureCompletedAt: Schema.String });
const snapshot = Schema.decodeUnknownSync(DraftSnapshot);

export const fixtureBridge = async (bridge: ShellBridge) => {
	const token = (await bridge.server()).token;
	const request = async (action: string, body: object) => {
		const response = await fetch(`/__fixture/${action}`, {
			method: "POST",
			headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		if (!response.ok) throw new Error(await response.text());
		return response.json();
	};
	const metadata = Schema.decodeUnknownSync(Metadata)(await request("metadata", {}));
	const banner = document.createElement("aside");
	banner.setAttribute("role", "status");
	const description = `Fixture: ${metadata.label} · Captured ${metadata.captureCompletedAt} · Execution disabled. Local edits and intent are saved only in this copy.`;
	banner.className = "shrink-0 border-b bg-muted px-4 py-2 text-xs text-foreground";
	document.body.classList.add("fixture-shell");
	banner.textContent = description;
	document.getElementById("fixture-banner")?.remove();
	banner.id = "fixture-banner";
	document.body.prepend(banner);
	const events = new EventSource(`/__fixture/events?token=${token}`);
	events.onmessage = (event) => {
		const status = Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Struct({ failure: Schema.NullOr(Schema.String) })))(event.data);
		banner.textContent = status.failure === null ? description : `${description} · ${status.failure}`;
	};
	events.onerror = () => {
		banner.textContent = `${description} · Viewer disconnected.`;
	};
	const changes = new BroadcastChannel(`fixture-drafts-${token}`);
	const read = async (ref: DraftRef) => snapshot(await request("draft/read", ref));
	const shell: ShellBridge = {
		...bridge,
		openExternal: () => {},
		readDraft: read,
		writeDraft: async (ref, text) => {
			const result = snapshot(await request("draft/write", { ...ref, text }));
			changes.postMessage(ref);
			return result;
		},
		clearDraft: async (ref, revision) => {
			await request("draft/clear", { ...ref, revision });
			changes.postMessage(ref);
		},
		subscribeDraft: (ref, listener) => {
			const receive = () => {
				void read(ref).then(listener);
			};
			changes.addEventListener("message", receive);
			return () => changes.removeEventListener("message", receive);
		},
	};
	return {
		bridge: shell,
		dispose: () => {
			events.close();
			changes.close();
			banner.remove();
			document.body.classList.remove("fixture-shell");
		},
	};
};
