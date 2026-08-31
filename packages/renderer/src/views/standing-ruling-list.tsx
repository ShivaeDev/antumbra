import type { StandingRulingView } from "@antumbra/contract";
import { StandingRulingCard } from "#views/standing-ruling-card.tsx";

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
