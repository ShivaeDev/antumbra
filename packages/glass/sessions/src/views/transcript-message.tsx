import type { TranscriptMessage as MessageItem, TranscriptThinking } from "@antumbra/domain-sessions/rows/transcript.ts";
import { MarkdownView } from "@antumbra/glass-components/markdown-view.tsx";
import type { InputsClient } from "@antumbra/glass-inputs/client.ts";
import { TranscriptImage } from "@antumbra/glass-inputs/transcript-image.tsx";
import { headline, runsLong } from "#transcript/opening.ts";
import { Disclosure } from "#views/transcript-disclosure.tsx";

const INSTRUCTED = { steer: "Steer", wake: "Wake" };

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

const Words = ({ markdown }: { readonly markdown: string }) => <MarkdownView className="markdown-typed" markdown={markdown} />;

const Section = ({ markdown, name }: { readonly markdown: string; readonly name: string }) => (
	<Disclosure bare body={<Words markdown={markdown} />} name={<span className="shrink-0 font-medium">{name}</span>} summary={headline(markdown)} />
);

const UserWords = ({ item }: { readonly item: MessageItem }) => {
	if (item.text === "") {
		return null;
	}
	if (item.served === "charter") {
		return (
			<>
				{item.standingOrders === undefined ? null : <Section markdown={item.standingOrders} name="Standing orders" />}
				<Section markdown={item.text} name="Charter" />
			</>
		);
	}
	const instructed = item.served === undefined ? undefined : INSTRUCTED[item.served];
	if (instructed === undefined || !runsLong(item.text)) {
		return <Words markdown={item.text} />;
	}
	return (
		<Disclosure
			bare
			body={<Words markdown={item.text} />}
			name={<span className="shrink-0 font-medium">{instructed}</span>}
			summary={headline(item.text)}
		/>
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
		<div className="flex flex-col gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
			<UserImages api={api} item={item} sessionId={sessionId} />
			<UserWords item={item} />
		</div>
	) : (
		<MarkdownView markdown={item.text} />
	);

export const TranscriptThought = ({ item }: { readonly item: TranscriptThinking }) => (
	<div className="border-l border-border pl-3 text-sm whitespace-pre-wrap text-muted-foreground wrap-anywhere">{item.text}</div>
);
