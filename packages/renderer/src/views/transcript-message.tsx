import type {
	TranscriptMessage as MessageItem,
	TranscriptThinking,
} from "#transcript/model.ts";
import { MarkdownView } from "#views/markdown-view.tsx";

// why: both sides of a transcript write Markdown, so both are read as the
// documents they are. A person's message keeps the fill that says a person
// typed it, and the line breaks they typed, which Markdown would otherwise
// fold into one paragraph.
export const TranscriptMessage = ({ item }: { readonly item: MessageItem }) =>
	item.role === "user" ? (
		<MarkdownView
			className="markdown-typed rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs"
			markdown={item.text}
		/>
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
