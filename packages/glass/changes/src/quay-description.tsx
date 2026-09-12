import { MarkdownView } from "@antumbra/glass-components/markdown-view.tsx";
import { SectionHeading } from "@antumbra/glass-components/section.tsx";
import type { QuayChange } from "#glass.ts";

export const QuayDescription = ({ item }: { readonly item: QuayChange }) => (
	<section className="flex flex-col gap-2">
		<SectionHeading title="Description" />
		{item.body.trim() === "" ? (
			<p className="text-xs text-muted-foreground">No description was provided.</p>
		) : (
			<MarkdownView className="text-xs" markdown={item.body} />
		)}
	</section>
);
