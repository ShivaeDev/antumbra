import type { AgentWork, PieceWork, VoyageCommand } from "@antumbra/contract";
import { ShipIcon } from "lucide-react";
import type { Navigate } from "#console/navigation.ts";
import { cn } from "#lib/utils.ts";
import { WorkChangeChip } from "#views/work-change.tsx";

// why: a piece and a voyage on a card are somewhere to go, so they are drawn
// as the links they are — plain words that underline on hover, never a button
// competing with the acts beside them.
const LINK =
	"min-w-0 rounded-sm text-left wrap-anywhere underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60";

const VoyageLink = ({
	className,
	onNavigate,
	voyageId,
	voyageName,
}: {
	readonly className?: string;
	readonly onNavigate: Navigate;
	readonly voyageId: string;
	readonly voyageName: string;
}) => (
	<button
		className={cn(LINK, className)}
		onClick={() => onNavigate({ mode: "voyages", pieceId: null, voyageId })}
		title="Open this voyage"
		type="button"
	>
		{voyageName}
	</button>
);

const PieceLine = ({
	onNavigate,
	work,
}: {
	readonly onNavigate: Navigate;
	readonly work: PieceWork;
}) => (
	<div className="flex min-w-0 flex-col gap-0.5">
		<button
			className={cn(LINK, "text-xs font-medium")}
			onClick={() =>
				onNavigate({
					mode: "voyages",
					pieceId: work.pieceId,
					voyageId: work.voyageId,
				})
			}
			title="Open this piece"
			type="button"
		>
			{work.pieceTitle}
		</button>
		<span className="flex min-w-0 items-center gap-1 text-2xs text-muted-foreground">
			<ShipIcon className="size-3 shrink-0" />
			<VoyageLink
				onNavigate={onNavigate}
				voyageId={work.voyageId}
				voyageName={work.voyageName}
			/>
		</span>
		{work.changes.length === 0 ? null : (
			<div className="flex min-w-0 flex-wrap items-center gap-1.5">
				{work.changes.map((held) => (
					<WorkChangeChip held={held} key={held.change.id} />
				))}
			</div>
		)}
	</div>
);

// why: a captain's work is the voyage it commands, so the line says so in
// those words rather than pretending the voyage is a piece.
const CommandLine = ({
	onNavigate,
	work,
}: {
	readonly onNavigate: Navigate;
	readonly work: VoyageCommand;
}) => (
	<div className="flex min-w-0 flex-wrap items-baseline gap-1 text-xs">
		<span className="shrink-0 text-muted-foreground">Captain of</span>
		<VoyageLink
			className="font-medium"
			onNavigate={onNavigate}
			voyageId={work.voyageId}
			voyageName={work.voyageName}
		/>
	</div>
);

export const AgentWorkLines = ({
	onNavigate,
	work,
}: {
	readonly onNavigate: Navigate;
	readonly work: ReadonlyArray<AgentWork>;
}) =>
	work.length === 0 ? null : (
		<div className="flex min-w-0 flex-col gap-1.5">
			{work.map((held) =>
				held.kind === "piece" ? (
					<PieceLine
						key={`${held.voyageId}/${held.pieceId}`}
						onNavigate={onNavigate}
						work={held}
					/>
				) : (
					<CommandLine
						key={held.voyageId}
						onNavigate={onNavigate}
						work={held}
					/>
				),
			)}
		</div>
	);
