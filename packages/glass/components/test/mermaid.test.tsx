import { until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { OutcomeMarkdownView } from "#outcome-markdown.tsx";

it.glass("shows Mermaid failures without leaving a global error diagram", function* ({ render }) {
	const container = yield* render(<OutcomeMarkdownView markdown={"```mermaid\nthis is not a diagram\n```"} />);
	yield* until(() => container.textContent?.includes("MermaidRenderError") === true, "the invalid diagram to report its failure");
	expect(document.body.querySelector('[id^="doutcome-"]')).toBeNull();
});
