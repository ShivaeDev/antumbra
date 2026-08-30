// why: @vitest-environment happy-dom exercises the real React click boundary.

import type { ChangeView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";
import { ChangeLink } from "#views/change-chip.tsx";

const { openExternal } = vi.hoisted(() => ({ openExternal: vi.fn() }));

vi.mock("#adapters/bridge.ts", () => ({ openExternal }));

const change: ChangeView = {
	activityAt: "2026-08-18T09:00:00.000Z",
	checks: "green",
	externalId: "42",
	host: "github",
	id: "change-42",
	isDraft: false,
	mergeable: "clean",
	observedAt: "2026-08-18T09:00:00.000Z",
	repoId: "repo-antumbra",
	repoName: "antumbra",
	review: "approved",
	stage: "open",
	title: "Confine privileged navigation",
	url: "https://github.com/example/antumbra/pull/42",
};

it("offers a host-derived Change URL as a link", () => {
	const html = renderToStaticMarkup(<ChangeLink change={change} />);

	expect(html).toContain("Confine privileged navigation");
	expect(html).toContain("<a ");
	expect(html).toContain(`href="${change.url}"`);
});

it("leaves a Change without a URL as plain text", () => {
	const html = renderToStaticMarkup(<ChangeLink change={{ ...change, url: null }} />);

	expect(html).toContain("Confine privileged navigation");
	expect(html).not.toContain("<a");
	expect(html).not.toContain("href=");
});

it.effect("sends a clicked Change to the external browser, not the window", () =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* Effect.promise(() =>
			act(() => {
				root.render(<ChangeLink change={change} />);
				return Promise.resolve();
			}),
		);
		const click = new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
		});

		yield* Effect.promise(() =>
			act(() => {
				container.querySelector("a")?.dispatchEvent(click);
				return Promise.resolve();
			}),
		);

		expect(openExternal).toHaveBeenCalledWith(change.url);
		expect(click.defaultPrevented).toBe(true);
	}),
);
