import type { QuayView } from "@antumbra/contract";
import { useEffect, useState } from "react";
import { watchQuay } from "#adapters/trpc-quay.ts";
import { QUAY_GROUPS, rowsIn } from "#quay/groups.ts";
import { AdoptChangeForm } from "#views/adopt-change-form.tsx";
import { QuayGroupPanel } from "#views/quay-group.tsx";
import { QuayHeader } from "#views/quay-header.tsx";
import { mutedStyle } from "#views/styles.ts";

const sectionStyle: React.CSSProperties = {
	display: "flex",
	flex: 1,
	flexDirection: "column",
	gap: "1.2rem",
	minWidth: 0,
	overflowX: "hidden",
	overflowY: "auto",
	padding: "1rem 1.4rem",
};

export const QuayPanel = ({
	onError,
}: {
	readonly onError: (message: string) => void;
}) => {
	const [quay, setQuay] = useState<QuayView | undefined>(undefined);
	const [feedError, setFeedError] = useState<string | undefined>(undefined);

	useEffect(() => watchQuay(setQuay, setFeedError), []);

	if (quay === undefined) {
		return (
			<section style={{ color: "#8a8f98", margin: "auto" }}>
				{feedError === undefined
					? "taking a sight…"
					: `feed lost: ${feedError}`}
			</section>
		);
	}
	return (
		<section style={sectionStyle}>
			{feedError === undefined ? null : (
				<div style={{ color: "#ff7c7c" }}>feed lost: {feedError}</div>
			)}
			<QuayHeader hosts={quay.hosts} onError={onError} />
			{quay.rows.length === 0 ? (
				<span style={mutedStyle}>Nothing at the quay.</span>
			) : null}
			{QUAY_GROUPS.map((group) => (
				<QuayGroupPanel group={group} key={group} rows={rowsIn(quay, group)} />
			))}
			<AdoptChangeForm onError={onError} pieces={quay.pieces} />
		</section>
	);
};
