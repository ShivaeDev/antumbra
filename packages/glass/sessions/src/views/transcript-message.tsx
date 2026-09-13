import type { TranscriptMessage as MessageItem, TranscriptThinking } from "@antumbra/domain-sessions/rows/transcript.ts";
import { MarkdownView } from "@antumbra/glass-components/markdown-view.tsx";
import type { InputsClient } from "@antumbra/glass-inputs/client.ts";
import { TranscriptImage } from "@antumbra/glass-inputs/transcript-image.tsx";
import { openingSummary } from "#transcript/opening.ts";
import { Disclosure } from "#views/transcript-disclosure.tsx";

const SERVED = {
	charter: { name: "Charter", subject: "this charter" },
	wake: { name: "Wake", subject: "what woke the session" },
};

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

const UserWords = ({ item }: { readonly item: MessageItem }) => {
	if (item.text === "") {
		return null;
	}
	const words = <MarkdownView className="markdown-typed" markdown={item.text} />;
	const served = item.served === undefined ? undefined : SERVED[item.served];
	const summary = served === undefined ? undefined : openingSummary(item.text);
	if (served === undefined || summary === undefined) {
		return words;
	}
	return (
		<Disclosure bare body={words} name={<span className="shrink-0 font-medium">{served.name}</span>} subject={served.subject} summary={summary} />
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
			<UserWords item={item} />
		</div>
	) : (
		<MarkdownView markdown={item.text} />
	);

export const TranscriptThought = ({ item }: { readonly item: TranscriptThinking }) => (
	<div className="whitespace-pre-wrap wrap-anywhere border-l border-border pl-2.5 text-xs text-muted-foreground">{item.text}</div>
);
