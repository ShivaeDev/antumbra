import { MarkdownView } from "#views/markdown-view.tsx";

export const OutcomeMarkdownView = ({ markdown }: { readonly markdown: string }) => (
	<MarkdownView className="overflow-x-auto rounded-lg border border-border bg-card px-3 py-2 text-card-foreground" markdown={markdown} />
);
