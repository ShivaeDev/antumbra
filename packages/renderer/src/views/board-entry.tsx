import type { BoardEntryView, BoardPieceSummaryView, PieceView } from "@antumbra/contract";
import { Button } from "#components/ui/button.tsx";
import { cn } from "#lib/utils.ts";
import { MarkdownView } from "#views/markdown-view.tsx";
import { authorLabel, boardEntryKindLabel, whenLabel } from "#voyages/labels.ts";

export interface BoardPieces {
	readonly known: ReadonlyArray<PieceView>;
	readonly onOpen: ((pieceId: string) => void) | undefined;
}

export const SMOOTHER = "Smoother";

export const Meta = ({ author, mono, when }: { readonly author: string; readonly mono: boolean; readonly when: string }) => (
	<div className="flex min-w-0 items-center gap-2 text-2xs text-muted-foreground">
		<span className={cn("min-w-0 truncate", mono ? "font-mono" : null)}>{author}</span>
		<span className="ml-auto shrink-0 tabular-nums">{when}</span>
	</div>
);

export const EntryRow = ({ entry }: { readonly entry: BoardEntryView }) => (
	<li className="flex min-w-0 flex-col gap-1">
		<Meta author={authorLabel(entry.authorAgentId)} mono={entry.authorAgentId !== null} when={whenLabel(entry.createdAt)} />
		<MarkdownView className="text-2xs text-muted-foreground" markdown={entry.body} />
	</li>
);

export const Block = ({
	author,
	children,
	entry,
	heading,
	mono,
}: {
	readonly author: string;
	readonly children?: React.ReactNode;
	readonly entry: BoardEntryView;
	readonly heading: string;
	readonly mono: boolean;
}) => (
	<li className="flex min-w-0 flex-col gap-1">
		<h3 className="min-w-0 truncate text-xs font-medium">{heading}</h3>
		<Meta author={author} mono={mono} when={whenLabel(entry.createdAt)} />
		<MarkdownView className="max-w-[72ch] text-sm" markdown={entry.body} />
		{children}
	</li>
);

export const PieceSummaryBlock = ({ entry, pieces }: { readonly entry: BoardPieceSummaryView; readonly pieces: BoardPieces }) => {
	const title = pieces.known.find((piece) => piece.id === entry.pieceId)?.title ?? entry.pieceId;
	const onOpen = pieces.onOpen;
	return (
		<li className="flex min-w-0 flex-col gap-1">
			<h3 className="min-w-0 truncate text-xs font-medium">{boardEntryKindLabel[entry.kind]}</h3>
			<Meta author={SMOOTHER} mono={false} when={whenLabel(entry.createdAt)} />
			{onOpen === undefined ? (
				<p className="min-w-0 truncate text-xs font-medium">{title}</p>
			) : (
				<Button
					className="h-auto min-w-0 justify-start self-start p-0 text-xs"
					onClick={() => onOpen(entry.pieceId)}
					title="Open this piece"
					variant="link"
				>
					<span className="min-w-0 truncate">{title}</span>
				</Button>
			)}
			<MarkdownView className="max-w-[72ch] text-sm" markdown={entry.body} />
		</li>
	);
};
