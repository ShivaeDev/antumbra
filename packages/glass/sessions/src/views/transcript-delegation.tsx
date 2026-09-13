import type { TranscriptDelegation } from "@antumbra/domain-sessions/rows/transcript.ts";
import { Marker } from "@antumbra/glass-components/compositions/marker.tsx";
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
		return <span className="min-w-0 truncate">{item.displayName}</span>;
	}
	return (
		<button className="min-w-0 truncate rounded-sm text-link underline-offset-2 hover:underline" onClick={() => onOpenNode(nodeId)} type="button">
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
	<Marker>
		<span className="flex min-w-0 items-center gap-2">
			subsession
			<Name item={item} onOpenNode={onOpenNode} />
			{stateWord(item)}
		</span>
	</Marker>
);
