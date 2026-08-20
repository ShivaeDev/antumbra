import { OutcomeMarkdownView } from "#views/outcome-markdown.tsx";
import {
	columnStyle,
	mutedStyle,
	quietButtonStyle,
	rowStyle,
} from "#views/styles.ts";

export interface OutcomeRef {
	readonly id: string;
	readonly title: string;
}

export type OutcomeDetail =
	| {
			readonly _tag: "failed";
			readonly message: string;
			readonly title: string;
	  }
	| {
			readonly _tag: "loaded";
			readonly markdown: string;
			readonly title: string;
	  }
	| { readonly _tag: "loading"; readonly title: string };

export const OutcomeChips = ({
	disabled,
	icon,
	onOpen,
	outcomes,
}: {
	readonly disabled: boolean;
	readonly icon: string;
	readonly onOpen: (outcome: OutcomeRef) => void;
	readonly outcomes: ReadonlyArray<OutcomeRef>;
}) => (
	<div style={{ ...rowStyle, flexWrap: "wrap" }}>
		{outcomes.map((outcome) => (
			<button
				disabled={disabled}
				key={outcome.id}
				onClick={() => onOpen(outcome)}
				style={{ ...quietButtonStyle, color: mutedStyle.color }}
				type="button"
			>
				{icon} {outcome.title}
			</button>
		))}
	</div>
);

// why: an outcome that can be taken somewhere says so beside its own title.
// The pane holds the slot and never learns what goes in it, so an outcome
// with nowhere to go simply passes nothing.
export const OutcomeDetailView = ({
	action,
	detail,
	onClose,
	reading,
}: {
	readonly action?: React.ReactNode;
	readonly detail: OutcomeDetail;
	readonly onClose: () => void;
	readonly reading: string;
}) => (
	<div style={columnStyle}>
		<div style={rowStyle}>
			<strong>{detail.title}</strong>
			{detail._tag === "loading" ? null : action}
			{detail._tag === "loading" ? null : (
				<button onClick={onClose} style={quietButtonStyle} type="button">
					close
				</button>
			)}
		</div>
		{detail._tag === "loading" ? (
			<span style={mutedStyle}>{reading}</span>
		) : null}
		{detail._tag === "failed" ? (
			<span style={{ color: "#ff7c7c" }}>{detail.message}</span>
		) : null}
		{detail._tag === "loaded" ? (
			<OutcomeMarkdownView markdown={detail.markdown} />
		) : null}
	</div>
);
