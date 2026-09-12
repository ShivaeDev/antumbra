import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import type { voyage as Voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { BoardPanel } from "@antumbra/glass-boards/board.tsx";
import { SmoothingLine, SmoothNow } from "@antumbra/glass-boards/smoothing.tsx";
import { Live } from "@antumbra/glass-client/live.tsx";
import { PieceList } from "@antumbra/glass-pieces/piece-list.tsx";
import { VoyageRoleSettings } from "@antumbra/glass-role-settings/voyage.tsx";
import { CaptainCall } from "#captain.tsx";
import { Crew } from "#crew.tsx";
import type { VoyageDisplayActions, VoyagesDisplayApi } from "#display.ts";
import { FocusToggle } from "#focus.tsx";
import { VoyageProgress, VoyageState } from "#progress.tsx";

type Props = VoyageDisplayActions & {
	readonly api: VoyagesDisplayApi;
	readonly voyageId: string;
	readonly pieceId?: string | undefined;
	readonly onPiece: (voyageId: string, pieceId: string | null) => void;
};
const VoyageContents = (props: Props & { readonly voyage: typeof Voyage.Row.Type }) => {
	const voyage = props.voyage;
	return (
		<section className="@container flex min-h-0 min-w-0 flex-1 flex-col font-sans">
			<header className="flex shrink-0 flex-col gap-2 border-b border-border bg-card px-5 py-3">
				<div className="flex flex-wrap items-center gap-2">
					<h1 className="min-w-0 flex-1 text-base">{voyage.name}</h1>
					<VoyageState api={props.api} voyageId={voyage.id} />
					<CaptainCall api={props.api} onHail={props.onHail} voyageId={voyage.id} />
					<FocusToggle api={props.api} focused={voyage.focusedAt !== null} voyageId={voyage.id} />
				</div>
				<VoyageRoleSettings api={props.api} voyageId={voyage.id} />
				<p className="text-xs">
					<span className="text-2xs text-muted-foreground">North star </span>
					{voyage.northStar}
				</p>
				{voyage.context === "" ? null : <p className="whitespace-pre-wrap text-xs text-muted-foreground">{voyage.context}</p>}
				<div className="flex flex-wrap items-end gap-4">
					<div className="max-w-md flex-1">
						<VoyageProgress api={props.api} voyageId={voyage.id} withLegend />
					</div>
					{props.renderSpend?.(voyage.id)}
				</div>
			</header>
			<div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
				<div className="grid min-w-0 grid-cols-1 items-start gap-6 px-5 py-4 @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @4xl:gap-8">
					<PieceList {...props} onSelect={(pieceId) => props.onPiece(voyage.id, pieceId)} selected={props.pieceId} />
					<div className="flex min-w-0 flex-col gap-6">
						<VoyageBoard {...props} />
						<Crew api={props.api} voyageId={voyage.id} />
					</div>
				</div>
			</div>
		</section>
	);
};
export const VoyageDetail = (props: Props) => (
	<Live input={{ id: VoyageId.make(props.voyageId) }} query={props.api.voyages.byId} waiting="taking a sight…">
		{(voyage) => (voyage === null ? <p>No such voyage</p> : <VoyageContents {...props} voyage={voyage} />)}
	</Live>
);

const VoyageBoard = (props: Props & { readonly voyage: typeof Voyage.Row.Type }) => {
	const voyage = props.voyage;
	return (
		<Live input={{ voyageId: voyage.id }} query={props.api.boards.smoothingState}>
			{(smoothing) => (
				<BoardPanel
					action={<SmoothNow onSmooth={() => props.onSmooth(voyage.id)} smoothing={smoothing} />}
					status={<SmoothingLine onSmooth={() => props.onSmooth(voyage.id)} smoothing={smoothing} />}
					api={props.api}
					name={voyage.name}
					onPiece={(pieceId) => props.onPiece(voyage.id, pieceId)}
					owner={{ kind: "voyage", voyageId: voyage.id }}
				/>
			)}
		</Live>
	);
};
