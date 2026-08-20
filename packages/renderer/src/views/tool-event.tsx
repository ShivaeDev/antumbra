import { useState } from "react";
import type { TranscriptTool } from "#transcript/model.ts";
import { toolSummary } from "#transcript/tool-summary.ts";

const boxStyle: React.CSSProperties = {
	background: "#20242c",
	borderRadius: "6px",
	fontFamily: "monospace",
	fontSize: "0.85rem",
	minWidth: 0,
	padding: "0.35rem 0.7rem",
};

const lineStyle: React.CSSProperties = {
	alignItems: "baseline",
	background: "none",
	border: "none",
	color: "#e4e2dd",
	cursor: "pointer",
	display: "flex",
	fontFamily: "inherit",
	fontSize: "inherit",
	gap: "0.4rem",
	padding: 0,
	textAlign: "left",
	width: "100%",
};

const summaryStyle: React.CSSProperties = {
	color: "#8a8f98",
	flex: 1,
	minWidth: 0,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
};

const bodyStyle: React.CSSProperties = {
	borderTop: "1px solid #2e323a",
	marginTop: "0.4rem",
	maxHeight: "22rem",
	overflow: "auto",
	paddingTop: "0.4rem",
	whiteSpace: "pre-wrap",
	wordBreak: "break-word",
};

const ToolBody = ({ item }: { readonly item: TranscriptTool }) => (
	<div style={bodyStyle}>
		<div>{item.input}</div>
		{item.result === undefined ? null : (
			<div style={{ color: "#8a8f98", marginTop: "0.5rem" }}>{item.result}</div>
		)}
	</div>
);

// why: a working agent spends most of the transcript in tool calls. Each one
// states itself in a single line and keeps its full input and output one click
// away, so narration stays readable without any evidence being hidden.
export const ToolEvent = ({ item }: { readonly item: TranscriptTool }) => {
	const [open, setOpen] = useState(false);
	const failed = item.ok === false;
	return (
		<div style={boxStyle}>
			<button
				onClick={() => setOpen(!open)}
				style={lineStyle}
				title={open ? "collapse this call" : "expand this call"}
				type="button"
			>
				<span style={{ color: "#8a8f98" }}>{open ? "▾" : "▸"}</span>
				<span style={{ color: failed ? "#ff7c7c" : "#e4e2dd" }}>
					{failed ? "✗" : "⚙"}
				</span>
				<strong>{item.name}</strong>
				<span style={summaryStyle}>{toolSummary(item.input)}</span>
				{item.result === undefined ? (
					<span style={{ color: "#8a8f98" }}>…</span>
				) : null}
			</button>
			{open ? <ToolBody item={item} /> : null}
		</div>
	);
};
