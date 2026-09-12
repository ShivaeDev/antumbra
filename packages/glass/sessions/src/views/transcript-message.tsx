import type { TranscriptMessage as MessageItem, TranscriptThinking } from "@antumbra/domain-sessions/rows/transcript.ts";
import { MarkdownView } from "@antumbra/glass-components/markdown-view.tsx";
import type { InputsClient } from "@antumbra/glass-inputs/client.ts";
import { TranscriptImage } from "@antumbra/glass-inputs/transcript-image.tsx";

const UserImages = ({ api, item, sessionId }: { readonly api: InputsClient; readonly item: MessageItem; readonly sessionId: string }) => {
	const images = item.parts.filter((part) => part.type === "image");
	return images.length === 0 ? null : (
		<div className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-2">
			{images.map((part) => (
				<TranscriptImage api={api} inputId={item.inputId} key={part.position} position={part.position} sessionId={sessionId} />
			))}
		</div>
	);
};

export const TranscriptMessage = ({
	api,
	item,
	sessionId,
}: {
	readonly api: InputsClient;
	readonly item: MessageItem;
	readonly sessionId: string;
}) =>
	item.role === "user" ? (
		<div className="flex flex-col gap-2 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs">
			<UserImages api={api} item={item} sessionId={sessionId} />
			{item.text === "" ? null : <MarkdownView className="markdown-typed" markdown={item.text} />}
		</div>
	) : (
		<MarkdownView markdown={item.text} />
	);

export const TranscriptThought = ({ item }: { readonly item: TranscriptThinking }) => (
	<div className="whitespace-pre-wrap wrap-anywhere border-l border-border pl-2.5 text-xs text-muted-foreground">{item.text}</div>
);
