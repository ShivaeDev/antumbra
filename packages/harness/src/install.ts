import type { AntumbraBridge } from "@antumbra/contract";

// why: the renderer declares window.antumbra as something the host supplied
// before the document ran, so the harness defines the property rather than
// assigning over a surface the type system treats as already fixed.
export const installBridge = (bridge: AntumbraBridge): void => {
	Object.defineProperty(window, "antumbra", {
		configurable: true,
		value: bridge,
	});
};
