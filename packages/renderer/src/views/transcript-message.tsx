import type { TranscriptMessage as MessageItem, TranscriptThinking } from "#transcript/model.ts";
import { MarkdownView } from "#views/markdown-view.tsx";
import { TranscriptImage } from "#views/transcript-image.tsx";

const UserImages = ({ item, sessionId }: { readonly item: MessageItem; readonly sessionId: string }) => {
	const images = item.parts.filter((part) => part.type === "image");
	return images.length === 0 ? null : (
		<div className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-2">
			{images.map((part) => (
				<TranscriptImage inputId={item.inputId} key={part.position} position={part.position} sessionId={sessionId} />
			))}
		</div>
	);
};

export const TranscriptMessage = ({ item, sessionId }: { readonly item: MessageItem; readonly sessionId: string }) =>
	item.role === "user" ? (
		<div className="flex flex-col gap-2 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs">
			<UserImages item={item} sessionId={sessionId} />
			{item.text === "" ? null : <MarkdownView className="markdown-typed" markdown={item.text} />}
		</div>
	) : (
		<MarkdownView markdown={item.text} />
	);

export const TranscriptThought = ({ item }: { readonly item: TranscriptThinking }) => (
	<div className="whitespace-pre-wrap wrap-anywhere border-l border-border pl-2.5 text-xs text-muted-foreground">{item.text}</div>
);
