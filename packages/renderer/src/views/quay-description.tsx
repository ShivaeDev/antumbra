import type { QuayChange } from "#quay/changes.ts";
import { MarkdownView } from "#views/markdown-view.tsx";
import { SectionHeading } from "#views/section.tsx";

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
