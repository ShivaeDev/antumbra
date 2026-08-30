import { MarkdownView } from "#views/markdown-view.tsx";

// why: an Outcome is read as a document, so it keeps the card the rest of the
// detail pane uses; the Markdown itself is rendered by the shared viewer.
export const OutcomeMarkdownView = ({ markdown }: { readonly markdown: string }) => (
	<MarkdownView className="overflow-x-auto rounded-lg border border-border bg-card px-3 py-2 text-card-foreground" markdown={markdown} />
);
