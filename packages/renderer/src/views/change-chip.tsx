import type { ChangeView } from "@antumbra/contract";
import { mutedStyle, rowStyle } from "#views/styles.ts";
import { changeMarks, changeName } from "#voyages/change-marks.ts";

// why: a landed change is history rather than news, so it recedes beside the
// ones still owed something.
const toneOf = (change: ChangeView): string =>
	change.stage === "landed" ? "#8a8f98" : "#7c9cff";

// why: the change opens where the repo lives — the merge is done there, and a
// window that embedded the host would be pretending otherwise.
export const ChangeLink = ({ change }: { readonly change: ChangeView }) => {
	if (change.url === null) {
		return <span style={mutedStyle}>{changeName(change)}</span>;
	}
	return (
		<a href={change.url} style={{ color: toneOf(change), fontSize: "0.75rem" }}>
			{changeName(change)}
		</a>
	);
};

export const ChangeChip = ({ change }: { readonly change: ChangeView }) => (
	<span style={{ ...rowStyle, gap: "0.35rem" }}>
		<span style={mutedStyle}>⛵</span>
		<ChangeLink change={change} />
		<span style={mutedStyle}>{changeMarks(change)}</span>
	</span>
);
