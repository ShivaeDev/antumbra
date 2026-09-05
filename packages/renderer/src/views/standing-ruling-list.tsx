import type { StandingRulingView } from "@antumbra/contract";
import { StandingRulingCard } from "#views/standing-ruling-card.tsx";

export const StandingRulingList = ({
	listed,
	standing,
}: {
	readonly listed: ReadonlyArray<StandingRulingView>;
	readonly standing: ReadonlyArray<StandingRulingView>;
}) => (
	<ul className="flex min-w-0 flex-col gap-2 px-4 pb-4">
		{listed.map((ruling) => (
			<StandingRulingCard key={ruling.id} others={standing.filter((other) => other.id !== ruling.id)} ruling={ruling} />
		))}
	</ul>
);
