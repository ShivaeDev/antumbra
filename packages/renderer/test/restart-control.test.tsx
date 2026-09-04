// @vitest-environment happy-dom

import type { AntumbraBridge, BridgeRequest } from "@antumbra/contract";
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

it.effect("asks before restarting and sends the restart through the bridge", () =>
	Effect.gen(function* () {
		const requests: Array<BridgeRequest> = [];
		const bridge: AntumbraBridge = {
			openExternal: () => undefined,
			subscribe: () => () => undefined,
			trpc: (request) => {
				requests.push(request);
				return Promise.resolve({ data: undefined, ok: true });
			},
		};
		Object.defineProperty(window, "antumbra", { configurable: true, value: bridge });
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* step(() => root.render(<RestartControl onError={() => undefined} />));
		expect(container.textContent).not.toContain("Stop running agents");

		yield* step(() => buttonNamed(container, "Restart Antumbra")?.click());
		expect(container.textContent).toContain("Stop running agents, restart, and wake them again");
		expect(requests).toEqual([]);

		yield* step(() => buttonNamed(container, "Restart")?.click());
		expect(requests).toEqual([{ input: undefined, path: "restart", type: "mutation" }]);
	}),
);
