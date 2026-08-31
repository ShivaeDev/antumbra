import type { AntumbraBridge } from "@antumbra/contract";

export const installBridge = (bridge: AntumbraBridge): void => {
	Object.defineProperty(window, "antumbra", {
		configurable: true,
		value: bridge,
	});
};
