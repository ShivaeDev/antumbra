import type { ReportMarkdown, ReportView } from "@antumbra/contract";
import { FileTextIcon } from "lucide-react";
import { useState } from "react";
import { readReportMarkdown } from "#adapters/trpc-voyages.ts";
import { useCall } from "#hooks/call.ts";
import { OutcomeChips, OutcomeDetailView } from "#views/outcome-detail.tsx";
import { detailOf, type OutcomeRef } from "#views/outcome-read.ts";

// why: a report says who wrote it, because it is one agent talking to another
// and the reader judges it by the hand behind it.
const named = (report: ReportMarkdown) => ({
	markdown: report.markdown,
	title: report.authorAgentId === null ? report.title : `${report.title} — report by ${report.authorAgentId}`,
});

export const ReportOutcomes = ({ reports }: { readonly reports: ReadonlyArray<ReportView> }) => {
	const [asked, setAsked] = useState("");
	const read = useCall<ReportMarkdown>();
	const open = (report: OutcomeRef): void => {
		setAsked(report.title);
		read.run((onDone, onError) => readReportMarkdown(report.id, onDone, onError));
	};
	const detail = detailOf(read.state, asked, named);
	if (reports.length === 0) return null;
	return (
		<>
			<OutcomeChips disabled={detail?._tag === "loading"} icon={<FileTextIcon />} onOpen={open} outcomes={reports} />
			{detail === undefined ? null : <OutcomeDetailView detail={detail} onClose={read.reset} reading="Reading the report…" />}
		</>
	);
};
