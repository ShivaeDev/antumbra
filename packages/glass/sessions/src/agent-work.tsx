import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { ChevronRightIcon } from "lucide-react";
import type { SessionsApi } from "#glass.ts";

export const AgentWork = (props: { readonly api: SessionsApi; readonly pieceIds: readonly string[] }) => (
	<span className="flex min-w-0 flex-col gap-1">
		{props.pieceIds.map((id) => (
			<Live key={id} query={props.api.pieces.byId} input={{ id: PieceId.make(id) }}>
				{(piece) => (piece === null ? null : <span className="line-clamp-2 text-xs text-muted-foreground">{piece.title}</span>)}
			</Live>
		))}
	</span>
);

export const AgentVoyage = (props: {
	readonly api: SessionsApi;
	readonly pieceIds: readonly string[];
	readonly voyageIds: readonly string[];
	readonly onPiece: (voyageId: string, pieceId: string) => void;
	readonly onVoyage: (voyageId: string) => void;
}) => {
	const pieceId = props.pieceIds[0];
	if (pieceId !== undefined) return <PieceWay api={props.api} onOpen={props.onPiece} pieceId={pieceId} />;
	const voyageId = props.voyageIds[0];
	if (voyageId !== undefined) return <Breadcrumb api={props.api} onOpen={() => props.onVoyage(voyageId)} voyageId={voyageId} />;
	return null;
};

const PieceWay = (props: { readonly api: SessionsApi; readonly pieceId: string; readonly onOpen: (voyageId: string, pieceId: string) => void }) => (
	<Live query={props.api.pieces.byId} input={{ id: PieceId.make(props.pieceId) }}>
		{(piece) =>
			piece === null ? null : <Breadcrumb api={props.api} onOpen={() => props.onOpen(piece.voyageId, piece.id)} voyageId={piece.voyageId} />
		}
	</Live>
);

const Breadcrumb = (props: { readonly api: SessionsApi; readonly voyageId: string; readonly onOpen: () => void }) => (
	<Live query={props.api.voyages.byId} input={{ id: VoyageId.make(props.voyageId) }}>
		{(voyage) =>
			voyage === null ? null : (
				<button
					aria-label={`Open voyage ${voyage.name}`}
					className="-mx-1 inline-flex w-fit min-w-0 items-center gap-1 rounded-md px-1 text-xs text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60"
					onClick={props.onOpen}
					type="button"
				>
					<span className="truncate">{voyage.name}</span>
					<ChevronRightIcon className="size-3 shrink-0" />
				</button>
			)
		}
	</Live>
);
