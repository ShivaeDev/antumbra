import type { AntumbraBridge, BridgeRequest, TrpcResponse } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { RestartControl } from "#views/restart-control.tsx";

const step = (run: () => void) =>
	Effect.promise(() =>
		act(() => {
			run();
			return Promise.resolve();
		}),
	);

const buttonNamed = (container: HTMLElement, label: string) =>
	[...container.querySelectorAll("button")].find((button) => button.textContent === label);

const bridgeAnswering = (requests: Array<BridgeRequest>, response: TrpcResponse): AntumbraBridge => ({
	openExternal: () => undefined,
	subscribe: () => () => undefined,
	trpc: (request) => {
		requests.push(request);
		return Promise.resolve(response);
	},
});

const mounted = (bridge: AntumbraBridge, onError: (message: string) => void) =>
	Effect.gen(function* () {
		Object.defineProperty(window, "antumbra", { configurable: true, value: bridge });
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* step(() => root.render(<RestartControl onError={onError} />));
		return container;
	});

it.effect("asks before restarting and sends the restart through the bridge once", () =>
	Effect.gen(function* () {
		const requests: Array<BridgeRequest> = [];
		const container = yield* mounted(bridgeAnswering(requests, { data: undefined, ok: true }), () => undefined);
		expect(container.textContent).not.toContain("Stop running agents");

		yield* step(() => buttonNamed(container, "Restart Antumbra")?.click());
		expect(container.textContent).toContain("Stop running agents, restart, and wake them again");
		expect(requests).toEqual([]);

		yield* step(() => buttonNamed(container, "Restart")?.click());
		expect(requests).toEqual([{ input: undefined, path: "restart", type: "mutation" }]);
		expect(buttonNamed(container, "Keep running")).toBeUndefined();

		const restarting = buttonNamed(container, "Restarting…");
		expect(restarting?.disabled).toBe(true);
		yield* step(() => restarting?.click());
		expect(requests).toHaveLength(1);
	}),
);

it.effect("offers the restart again when the request fails", () =>
	Effect.gen(function* () {
		const requests: Array<BridgeRequest> = [];
		const errors: Array<string> = [];
		let failed: () => void = () => undefined;
		const failure = new Promise<void>((resolve) => {
			failed = resolve;
		});
		const refused: TrpcResponse = { error: { code: "PRECONDITION_FAILED", message: "the drain refused" }, ok: false };
		const container = yield* mounted(bridgeAnswering(requests, refused), (message) => {
			errors.push(message);
			failed();
		});

		yield* step(() => buttonNamed(container, "Restart Antumbra")?.click());
		yield* step(() => buttonNamed(container, "Restart")?.click());
		yield* Effect.promise(() => act(() => failure));
		expect(errors).toEqual(["PRECONDITION_FAILED: the drain refused"]);
		expect(buttonNamed(container, "Restarting…")).toBeUndefined();
		expect(buttonNamed(container, "Keep running")).toBeDefined();

		yield* step(() => buttonNamed(container, "Restart")?.click());
		expect(requests).toHaveLength(2);
	}),
);
