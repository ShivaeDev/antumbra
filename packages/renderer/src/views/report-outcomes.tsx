import type { ReportMarkdown, ReportView } from "@antumbra/contract";
import { OutcomeChips, OutcomeDetailView } from "@antumbra/glass-components/outcome-detail.tsx";
import type { OutcomeRef } from "@antumbra/glass-components/outcome-read.ts";
import { FileTextIcon } from "lucide-react";
import { useState } from "react";
import { readReportMarkdown } from "#adapters/trpc-voyages.ts";
import { useCall } from "#hooks/call.ts";
import { detailOf } from "#views/outcome-read.ts";

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
