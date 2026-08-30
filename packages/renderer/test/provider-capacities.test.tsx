// why: @vitest-environment happy-dom proves the deliberate retry crosses the
// real provider-capacity control instead of being only painted as a button.

import type { BackendCapacitySummary } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";
import { ProviderCapacities } from "#views/provider-capacities.tsx";

const { retryBackend } = vi.hoisted(() => ({ retryBackend: vi.fn() }));

vi.mock("#adapters/trpc.ts", () => ({ retryBackend }));

const blocked: BackendCapacitySummary = {
	backend: "codex",
	detail: "You've hit your usage limit",
	reason: "usage-limit",
	resetsAt: null,
	status: "blocked",
	utilization: null,
};

const warning: BackendCapacitySummary = {
	backend: "claude",
	detail: "You have 9% of the hourly limit left",
	reason: "usage-limit",
	resetsAt: 1_788_046_800_000,
	status: "warning",
	utilization: 0.91,
};

const render = (capacities: ReadonlyArray<BackendCapacitySummary>): string =>
	renderToStaticMarkup(
		<ProviderCapacities capacities={capacities} onError={() => undefined} />,
	);

it("shows a provider warning without offering a retry", () => {
	const markup = render([warning]);
	expect(markup).toContain("Provider limit warning");
	expect(markup).toContain("You have 9% of the hourly limit left");
	expect(markup).toContain("91% used");
	expect(markup).toContain("Work continues");
	expect(markup).not.toContain("Retry provider");
});

it("offers a deliberate retry only while a provider is paused", () => {
	const markup = render([blocked]);
	expect(markup).toContain("Provider paused");
	expect(markup).toContain("Waiting work stays parked");
	expect(markup).toContain("Retry provider");
});

it.effect("retries the backend named by the blocked reading", () =>
	Effect.gen(function* () {
		const onError = vi.fn();
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* Effect.promise(() =>
			act(() => {
				root.render(
					<ProviderCapacities capacities={[blocked]} onError={onError} />,
				);
				return Promise.resolve();
			}),
		);
		yield* Effect.promise(() =>
			act(() => {
				container.querySelector("button")?.click();
				return Promise.resolve();
			}),
		);
		expect(retryBackend).toHaveBeenCalledWith("codex", onError);
		yield* Effect.promise(() =>
			act(() => {
				root.unmount();
				return Promise.resolve();
			}),
		);
	}),
);
