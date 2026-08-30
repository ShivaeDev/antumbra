import type { AgentWork, PieceWork, VoyageCommand } from "@antumbra/contract";
import { ShipIcon } from "lucide-react";
import { cn } from "#lib/utils.ts";

const LINK =
	"min-w-0 rounded-sm text-left wrap-anywhere underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60";

const VoyageLink = ({
	className,
	onVoyage,
	voyageId,
	voyageName,
}: {
	readonly className?: string;
	readonly onVoyage: (voyageId: string) => void;
	readonly voyageId: string;
	readonly voyageName: string;
}) => (
	<button className={cn(LINK, className)} onClick={() => onVoyage(voyageId)} title="Open this voyage" type="button">
		{voyageName}
	</button>
);

const PieceLine = ({
	onPiece,
	onVoyage,
	work,
}: {
	readonly onPiece: (voyageId: string, pieceId: string) => void;
	readonly onVoyage: (voyageId: string) => void;
	readonly work: PieceWork;
}) => (
	<div className="flex min-w-0 flex-col gap-0.5">
		<button className={cn(LINK, "text-xs font-medium")} onClick={() => onPiece(work.voyageId, work.pieceId)} title="Open this piece" type="button">
			{work.pieceTitle}
		</button>
		<span className="flex min-w-0 items-center gap-1 text-2xs text-muted-foreground">
			<ShipIcon className="size-3 shrink-0" />
			<VoyageLink onVoyage={onVoyage} voyageId={work.voyageId} voyageName={work.voyageName} />
		</span>
	</div>
);

const CommandLine = ({ onVoyage, work }: { readonly onVoyage: (voyageId: string) => void; readonly work: VoyageCommand }) => (
	<div className="flex min-w-0 flex-wrap items-baseline gap-1 text-xs">
		<span className="shrink-0 text-muted-foreground">Captain of</span>
		<VoyageLink className="font-medium" onVoyage={onVoyage} voyageId={work.voyageId} voyageName={work.voyageName} />
	</div>
);

export const AgentWorkLines = ({
	onPiece,
	onVoyage,
	work,
}: {
	readonly onPiece: (voyageId: string, pieceId: string) => void;
	readonly onVoyage: (voyageId: string) => void;
	readonly work: ReadonlyArray<AgentWork>;
}) =>
	work.length === 0 ? null : (
		<div className="flex min-w-0 flex-col gap-1.5">
			{work.map((held) =>
				held.kind === "piece" ? (
					<PieceLine key={`${held.voyageId}/${held.pieceId}`} onPiece={onPiece} onVoyage={onVoyage} work={held} />
				) : (
					<CommandLine key={held.voyageId} onVoyage={onVoyage} work={held} />
				),
			)}
		</div>
	);
