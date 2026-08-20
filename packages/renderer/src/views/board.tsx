import type { BoardEntryView, BoardTarget } from "@antumbra/contract";
import { useState } from "react";
import { writeBoard } from "#adapters/trpc-voyages.ts";
import {
	buttonStyle,
	cardStyle,
	columnStyle,
	headingStyle,
	inputStyle,
	mutedStyle,
	rowStyle,
} from "#views/styles.ts";
import { authorLabel, whenLabel } from "#voyages/labels.ts";
import { bySalience } from "#voyages/order.ts";

const EntryRow = ({ entry }: { readonly entry: BoardEntryView }) => (
	<div style={cardStyle}>
		<div style={rowStyle}>
			<span style={mutedStyle}>{entry.register}</span>
			<span style={mutedStyle}>{authorLabel(entry.authorAgentId)}</span>
			<span style={mutedStyle}>{whenLabel(entry.createdAt)}</span>
		</div>
		<span style={{ whiteSpace: "pre-wrap" }}>{entry.body}</span>
	</div>
);

const WriteRow = ({
	onError,
	scope,
}: {
	readonly onError: (message: string) => void;
	readonly scope: BoardTarget;
}) => {
	const [body, setBody] = useState("");
	const [register, setRegister] =
		useState<BoardEntryView["register"]>("smooth");
	const write = () =>
		writeBoard({ body, register, scope }, () => setBody(""), onError);
	return (
		<div style={columnStyle}>
			<textarea
				onChange={(event) => setBody(event.target.value)}
				placeholder="write to the board"
				rows={2}
				style={inputStyle}
				value={body}
			/>
			<div style={rowStyle}>
				<button
					onClick={() =>
						setRegister(register === "smooth" ? "rough" : "smooth")
					}
					style={buttonStyle}
					type="button"
				>
					{register}
				</button>
				<button
					disabled={body === ""}
					onClick={write}
					style={{ ...buttonStyle, opacity: body === "" ? 0.5 : 1 }}
					type="button"
				>
					write
				</button>
			</div>
		</div>
	);
};

export const BoardPanel = ({
	entries,
	onError,
	scope,
}: {
	readonly entries: ReadonlyArray<BoardEntryView>;
	readonly onError: (message: string) => void;
	readonly scope: BoardTarget;
}) => (
	<div style={columnStyle}>
		<h2 style={headingStyle}>board</h2>
		{bySalience(entries).map((entry) => (
			<EntryRow entry={entry} key={entry.id} />
		))}
		<WriteRow onError={onError} scope={scope} />
	</div>
);
