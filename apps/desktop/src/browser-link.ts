import type { Serving } from "@antumbra/platform-shell/bridge.ts";

const WEB = ["http:", "https:"];

export const browserLink = (document: string, serving: Serving): string | undefined => {
	const address = new URL(document);
	if (!WEB.includes(address.protocol)) {
		return undefined;
	}
	address.search = new URLSearchParams({ port: String(serving.port), token: serving.token }).toString();
	return address.toString();
};
