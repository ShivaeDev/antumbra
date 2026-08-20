import type { SessionEvent } from "@antumbra/contract";
import { useEffect, useRef } from "react";
import { watchSessionEvents } from "#adapters/trpc.ts";
import { useFeedLog } from "#hooks/feed.ts";
import { deriveTranscript } from "#transcript/derive.ts";
import type { TranscriptItem } from "#transcript/model.ts";
import { ToolEvent } from "#views/tool-event.tsx";

const itemStyle: Record<
	Exclude<TranscriptItem["kind"], "tool">,
	React.CSSProperties
> = {
	message: { overflowWrap: "break-word", whiteSpace: "pre-wrap" },
	// why: a provider's raw payload arrives as one unbroken line of tens of
	// thousands of characters. It wraps and scrolls inside its own box so no
	// single event can stretch the transcript sideways.
	raw: {
		color: "#8a8f98",
		fontFamily: "monospace",
		fontSize: "0.8rem",
		maxHeight: "12rem",
		overflow: "auto",
		overflowWrap: "break-word",
	},
	telemetry: {
		borderTop: "1px solid #2e323a",
		color: "#8a8f98",
		fontSize: "0.8rem",
		paddingTop: "0.4rem",
	},
	thinking: {
		color: "#8a8f98",
		fontStyle: "italic",
		overflowWrap: "break-word",
		whiteSpace: "pre-wrap",
	},
};

const Item = ({ item }: { readonly item: TranscriptItem }) => {
	if (item.kind === "message") {
		return (
			<div style={itemStyle.message}>
				<strong style={{ color: item.role === "user" ? "#7c9cff" : "#a48fff" }}>
					{item.role}
				</strong>
				<div>{item.text}</div>
			</div>
		);
	}
	if (item.kind === "thinking") {
		return <div style={itemStyle.thinking}>{item.text}</div>;
	}
	if (item.kind === "tool") {
		return <ToolEvent item={item} />;
	}
	if (item.kind === "telemetry") {
		return <div style={itemStyle.telemetry}>{item.label}</div>;
	}
	return (
		<div style={itemStyle.raw}>
			{item.label} {item.payload}
		</div>
	);
};

export const TranscriptView = ({
	sessionId,
}: {
	readonly sessionId: string;
}) => {
	const tailRef = useRef<HTMLDivElement>(null);
	const { error: feedError, value: events } = useFeedLog<SessionEvent>(
		sessionId,
		(onEvent, onError) =>
			watchSessionEvents({ fromSeq: 0, sessionId }, onEvent, onError),
	);

	const count = events.length;
	useEffect(() => {
		tailRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [count]);

	const items = deriveTranscript(events);
	return (
		<section
			style={{
				display: "flex",
				flex: 1,
				flexDirection: "column",
				gap: "0.6rem",
				minWidth: 0,
				overflowY: "auto",
				padding: "1rem 1.4rem",
			}}
		>
			{feedError === undefined ? null : (
				<div style={{ color: "#ff7c7c" }}>feed lost: {feedError}</div>
			)}
			{items.length === 0 ? (
				<div style={{ color: "#8a8f98" }}>no events yet</div>
			) : (
				items.map((item, index) => (
					<Item item={item} key={`${item.seq}-${index}`} />
				))
			)}
			<div ref={tailRef} />
		</section>
	);
};
