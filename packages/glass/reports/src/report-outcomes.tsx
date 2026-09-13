import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { ReportId } from "@antumbra/domain-reports/ids.ts";
import type { ReportReading } from "@antumbra/domain-reports/queries/by-id.ts";
import { useLive } from "@antumbra/glass-client/hooks.ts";
import { Live, lastRead } from "@antumbra/glass-client/live.tsx";
import { useHolding } from "@antumbra/glass-client/reconnection.tsx";
import { OutcomeChips, OutcomeDetailView } from "@antumbra/glass-components/outcome-detail.tsx";
import type { OutcomeDetail, OutcomeRef } from "@antumbra/glass-components/outcome-read.ts";
import { Option } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { FileTextIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { ReportsApi } from "#glass.ts";

const READING = "Reading the report…";
const UNREACHED = "The server could not be reached";

const ReadingReport = (props: {
	readonly api: ReportsApi;
	readonly selected: OutcomeRef;
	readonly reports: readonly OutcomeRef[];
	readonly onOpen: (report: OutcomeRef) => void;
	readonly onClose: () => void;
}): ReactNode => {
	const result = useLive(props.api.reports.byId, { id: ReportId.make(props.selected.id) });
	const last = lastRead(result);
	useHolding(Option.isSome(last) && !AsyncResult.isSuccess(result));
	const read = (value: ReportReading | null): OutcomeDetail => {
		if (value === null) return { _tag: "failed", title: props.selected.title, message: `no such report: ${props.selected.id}` };
		return {
			_tag: "loaded",
			title: value.authorAgentId === null ? value.title : `${value.title} — report by ${value.authorAgentId}`,
			markdown: value.body,
		};
	};
	const unread: OutcomeDetail = AsyncResult.isFailure(result)
		? { _tag: "failed", title: props.selected.title, message: UNREACHED }
		: { _tag: "loading", title: props.selected.title };
	const detail = Option.match(last, { onNone: () => unread, onSome: read });
	return (
		<>
			<OutcomeChips disabled={detail._tag === "loading"} icon={<FileTextIcon />} onOpen={props.onOpen} outcomes={props.reports} />
			<OutcomeDetailView detail={detail} onClose={props.onClose} reading={READING} />
		</>
	);
};

export const ReportReferences = (props: { readonly api: ReportsApi; readonly reports: readonly OutcomeRef[] }): ReactNode => {
	const [selected, select] = useState<OutcomeRef | null>(null);
	if (props.reports.length === 0) return null;
	return selected === null ? (
		<OutcomeChips disabled={false} icon={<FileTextIcon />} onOpen={select} outcomes={props.reports} />
	) : (
		<ReadingReport api={props.api} onClose={() => select(null)} onOpen={select} reports={props.reports} selected={selected} />
	);
};

export const ReportOutcomes = (props: { readonly api: ReportsApi; readonly pieceId: string }): ReactNode => (
	<Live input={{ pieceId: PieceId.make(props.pieceId) }} query={props.api.reports.byPiece}>
		{(reports) => <ReportReferences api={props.api} reports={reports} />}
	</Live>
);
