import type { StandingRulingView } from "@antumbra/contract";
import { StandingRulingCard } from "#views/standing-ruling-card.tsx";

// why: the successors a card may name are every other ruling that stands, not
// only the ones listed beside it — a stale ruling is replaceable by a fresh one
// and the grouping is a reading rather than a fence.
export const StandingRulingList = ({
	listed,
	onError,
	standing,
}: {
	readonly listed: ReadonlyArray<StandingRulingView>;
	readonly onError: (message: string) => void;
	readonly standing: ReadonlyArray<StandingRulingView>;
}) => (
	<ul className="flex min-w-0 flex-col gap-2 px-4 pb-4">
		{listed.map((ruling) => (
			<StandingRulingCard key={ruling.id} onError={onError} others={standing.filter((other) => other.id !== ruling.id)} ruling={ruling} />
		))}
	</ul>
);
