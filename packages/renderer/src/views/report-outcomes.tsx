import type { ReportView } from "@antumbra/contract";
import { useState } from "react";
import { readReportMarkdown } from "#adapters/trpc-voyages.ts";
import {
	OutcomeChips,
	type OutcomeDetail,
	OutcomeDetailView,
	type OutcomeRef,
} from "#views/outcome-detail.tsx";

// why: a report says who wrote it, because it is one agent talking to another
// and the reader judges it by the hand behind it.
const heading = (title: string, authorAgentId: string | null): string =>
	authorAgentId === null ? title : `${title} — report by ${authorAgentId}`;

export const ReportOutcomes = ({
	reports,
}: {
	readonly reports: ReadonlyArray<ReportView>;
}) => {
	const [detail, setDetail] = useState<OutcomeDetail | undefined>(undefined);
	const open = (report: OutcomeRef): void => {
		setDetail({ _tag: "loading", title: report.title });
		readReportMarkdown(
			report.id,
			(loaded) =>
				setDetail({
					_tag: "loaded",
					markdown: loaded.markdown,
					title: heading(loaded.title, loaded.authorAgentId),
				}),
			(message) => setDetail({ _tag: "failed", message, title: report.title }),
		);
	};
	if (reports.length === 0) return null;
	return (
		<>
			<OutcomeChips
				disabled={detail?._tag === "loading"}
				icon="📄"
				onOpen={open}
				outcomes={reports}
			/>
			{detail === undefined ? null : (
				<OutcomeDetailView
					detail={detail}
					onClose={() => setDetail(undefined)}
					reading="reading report…"
				/>
			)}
		</>
	);
};
