import { Separator } from "#components/ui/separator.tsx";
import type { TranscriptDelegation } from "#transcript/model.ts";
import { outcomeWords } from "#views/session-outcome-words.ts";

const stateWord = ({ outcome, state }: TranscriptDelegation): string => {
	if (state === "opened") {
		return "Started";
	}
	return outcome === undefined ? "Ended" : outcomeWords[outcome];
};

const Name = ({ item, onOpenNode }: { readonly item: TranscriptDelegation; readonly onOpenNode: ((nodeId: string) => void) | undefined }) => {
	const nodeId = item.nodeId;
	if (nodeId === undefined || onOpenNode === undefined) {
		return <span className="min-w-0 truncate text-2xs">{item.displayName}</span>;
	}
	return (
		<button
			className="min-w-0 truncate rounded-sm text-2xs text-link underline-offset-2 hover:underline"
			onClick={() => onOpenNode(nodeId)}
			type="button"
		>
			{item.displayName}
		</button>
	);
};

export const TranscriptDelegationMark = ({
	item,
	onOpenNode,
}: {
	readonly item: TranscriptDelegation;
	readonly onOpenNode: ((nodeId: string) => void) | undefined;
}) => (
	<div className="flex items-center gap-2 py-1">
		<Separator className="flex-1" />
		<span className="shrink-0 text-2xs text-muted-foreground">subsession</span>
		<Name item={item} onOpenNode={onOpenNode} />
		<span className="shrink-0 text-2xs text-muted-foreground">{stateWord(item)}</span>
		<Separator className="flex-1" />
	</div>
);
