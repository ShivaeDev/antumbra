// @vitest-environment happy-dom

import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";
import { OutcomeMarkdownView } from "#views/outcome-markdown.tsx";

it.effect("shows Mermaid failures without leaving a global error diagram", () =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		yield* Effect.promise(() =>
			act(() => {
				root.render(<OutcomeMarkdownView markdown={"```mermaid\nthis is not a diagram\n```"} />);
				return Promise.resolve();
			}),
		);

		yield* Effect.promise(() => vi.waitFor(() => expect(container.textContent).toContain("MermaidRenderError")));
		expect(document.body.querySelector('[id^="doutcome-"]')).toBeNull();
		yield* Effect.promise(() =>
			act(() => {
				root.unmount();
				container.remove();
				return Promise.resolve();
			}),
		);
	}),
);
