import type { SessionEvent } from "@antumbra/contract";
import { useEffect, useRef, useState } from "react";
import { watchSessionEvents } from "#adapters/trpc.ts";
import { deriveTranscript, type TranscriptItem } from "#transcript.ts";

const itemStyle: Record<TranscriptItem["kind"], React.CSSProperties> = {
	message: { whiteSpace: "pre-wrap" },
	raw: { color: "#8a8f98", fontFamily: "monospace", fontSize: "0.8rem" },
	telemetry: {
		borderTop: "1px solid #2e323a",
		color: "#8a8f98",
		fontSize: "0.8rem",
		paddingTop: "0.4rem",
	},
	tool: {
		background: "#20242c",
		borderRadius: "6px",
		fontFamily: "monospace",
		fontSize: "0.85rem",
		padding: "0.5rem 0.7rem",
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
	if (item.kind === "tool") {
		return (
			<div style={itemStyle.tool}>
				<div>
					⚙ {item.name} {item.input}
				</div>
				{item.result === undefined ? null : (
					<div style={{ color: "#8a8f98", marginTop: "0.3rem" }}>
						{item.result.length > 600
							? `${item.result.slice(0, 600)}…`
							: item.result}
					</div>
				)}
			</div>
		);
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
	const [events, setEvents] = useState<ReadonlyArray<SessionEvent>>([]);
	const [feedError, setFeedError] = useState<string | undefined>(undefined);
	const tailRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setEvents([]);
		setFeedError(undefined);
		return watchSessionEvents(
			{ fromSeq: 0, sessionId },
			(event) => setEvents((current) => [...current, event]),
			setFeedError,
		);
	}, [sessionId]);

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
				gap: "0.8rem",
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
