import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import type { voyage as Voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { BoardPanel } from "@antumbra/glass-boards/board.tsx";
import { SmoothingLine, SmoothNow } from "@antumbra/glass-boards/smoothing.tsx";
import { Live } from "@antumbra/glass-client/live.tsx";
import { PageHeader } from "@antumbra/glass-components/compositions/page-header.tsx";
import { SectionHeading } from "@antumbra/glass-components/compositions/section-heading.tsx";
import { MarkdownView } from "@antumbra/glass-components/markdown-view.tsx";
import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import { ScrollArea } from "@antumbra/glass-components/shadcn/scroll-area.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@antumbra/glass-components/shadcn/tooltip.tsx";
import { PieceList } from "@antumbra/glass-pieces/piece-list.tsx";
import { VoyageRoleSettings } from "@antumbra/glass-role-settings/voyage.tsx";
import { ArrowLeftIcon } from "lucide-react";
import { CaptainAct, CaptainLine } from "#captain.tsx";
import { Crew } from "#crew.tsx";
import type { VoyageDisplayActions, VoyagesDisplayApi } from "#display.ts";
import { VoyageCaption, VoyageState } from "#progress.tsx";
import { QuietAct } from "#quiet.tsx";

const BACK = "Back";

type Props = VoyageDisplayActions & {
	readonly api: VoyagesDisplayApi;
	readonly voyageId: string;
	readonly pieceId?: string | undefined;
	readonly agentId?: string | undefined;
	readonly onBack: () => void;
	readonly onPiece: (voyageId: string, pieceId: string | null) => void;
	readonly onAgent: (agentId: string) => void;
};

const Back = ({ onBack }: { readonly onBack: () => void }) => (
	<Tooltip>
		<TooltipTrigger asChild>
			<Button aria-label={BACK} className="mt-0.5" onClick={onBack} size="icon-sm" variant="ghost">
				<ArrowLeftIcon />
			</Button>
		</TooltipTrigger>
		<TooltipContent>{BACK}</TooltipContent>
	</Tooltip>
);

const VoyageContents = (props: Props & { readonly voyage: typeof Voyage.Row.Type }) => {
	const voyage = props.voyage;
	const quieted = voyage.quietedAt !== null;
	return (
		<section className="flex min-h-0 min-w-0 flex-1 flex-col">
			<div className="max-w-[1040px] shrink-0 px-6 pt-5">
				<PageHeader
					actions={
						<>
							<QuietAct api={props.api} quieted={quieted} voyageId={voyage.id} />
							<CaptainAct api={props.api} onHail={props.onHail} voyageId={voyage.id} />
						</>
					}
					back={<Back onBack={props.onBack} />}
					description={<VoyageCaption api={props.api} quieted={quieted} spend={props.renderSpend?.(voyage.id)} voyageId={voyage.id} />}
					state={<VoyageState api={props.api} quieted={quieted} voyageId={voyage.id} />}
					title={voyage.name}
					titleTooltip
				/>
			</div>
			<ScrollArea className="min-h-0 flex-1">
				<div className="max-w-[1040px] space-y-8 px-6 pb-10">
					<SectionHeading collapsible title="North star">
						<p className="max-w-[72ch] text-sm leading-6">{voyage.northStar}</p>
					</SectionHeading>
					{voyage.context === "" ? null : (
						<SectionHeading collapsible title="Charter">
							<MarkdownView className="max-w-[72ch] text-sm" markdown={voyage.context} />
						</SectionHeading>
					)}
					<SectionHeading collapsible title="Roles">
						<VoyageRoleSettings api={props.api} voyageId={voyage.id} />
					</SectionHeading>
					<PieceList {...props} onSelect={(pieceId) => props.onPiece(voyage.id, pieceId)} selected={props.pieceId}>
						<VoyageBoard {...props} voyage={voyage} />
					</PieceList>
					<Crew agentId={props.agentId} api={props.api} onAgent={props.onAgent} voyageId={voyage.id} />
					<SectionHeading title="Captain">
						<CaptainLine agentId={props.agentId} api={props.api} onAgent={props.onAgent} voyageId={voyage.id} />
					</SectionHeading>
				</div>
			</ScrollArea>
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
