import { settle } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { ExternalLinkContext } from "#external-link.tsx";
import { MarkdownView } from "#markdown-view.tsx";

it.glass("keeps a markdown link in the console while the shell opens its destination", function* ({ render }) {
	let destination: string | undefined;
	const container = yield* render(
		<ExternalLinkContext
			value={(url) => {
				destination = url;
			}}
		>
			<MarkdownView markdown={"# Soundings\n\nRead [the chart](https://charts.example/reef)."} />
		</ExternalLinkContext>,
	);
	const link = container.querySelector("a");
	expect(container.querySelector("h1")?.textContent).toBe("Soundings");
	expect(link?.textContent).toBe("the chart");
	const click = new MouseEvent("click", { bubbles: true, cancelable: true });
	yield* settle(() => {
		link?.dispatchEvent(click);
	});
	expect(click.defaultPrevented).toBe(true);
	expect(destination).toBe("https://charts.example/reef");
});

it.glass("writes an ssh remote as text instead of a mail link", function* ({ render }) {
	const container = yield* render(<MarkdownView markdown={"Clone git@github.com:ShivaeDev/antumbra.git and read the chart."} />);
	expect(container.querySelector("a")).toBeNull();
	expect(container.textContent).toContain("git@github.com:ShivaeDev/antumbra.git");
});
