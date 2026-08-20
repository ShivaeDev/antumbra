import type {
	TranscriptMessage as MessageItem,
	TranscriptThinking,
} from "#transcript/model.ts";
import { MarkdownView } from "#views/markdown-view.tsx";

// why: the two sides of a transcript are different kinds of text. What a
// person typed is verbatim and stays as typed; what the agent wrote is
// Markdown it authored, so it is rendered as the document it is.
export const TranscriptMessage = ({ item }: { readonly item: MessageItem }) =>
	item.role === "user" ? (
		<div className="whitespace-pre-wrap wrap-anywhere rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs">
			{item.text}
		</div>
	) : (
		<MarkdownView markdown={item.text} />
	);

// why: thinking is the agent talking to itself. It stays legible for the
// reader who wants it and recedes for the one who does not, which is a step
// down in weight rather than a fill of its own.
export const TranscriptThought = ({
	item,
}: {
	readonly item: TranscriptThinking;
}) => (
	<div className="whitespace-pre-wrap wrap-anywhere border-l border-border pl-2.5 text-xs text-muted-foreground">
		{item.text}
	</div>
);
