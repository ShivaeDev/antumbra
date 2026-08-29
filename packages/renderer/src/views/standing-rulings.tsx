import type { StandingRulingsView } from "@antumbra/contract";
import { StandingRulingCard } from "#views/standing-ruling-card.tsx";

const Standing = ({
	error,
	onError,
	standing,
}: {
	readonly error: string | undefined;
	readonly onError: (message: string) => void;
	readonly standing: StandingRulingsView | undefined;
}) => {
	if (standing === undefined) {
		return (
			<p aria-live="polite" className="px-4 py-3 text-xs text-muted-foreground">
				{error === undefined
					? "reading what stands…"
					: `standing feed lost: ${error}`}
			</p>
		);
	}
	if (standing.rulings.length === 0) {
		return (
			<p className="px-4 py-3 text-xs text-muted-foreground">
				Nothing stands yet. A ruling stands here from the moment it is ruled
				until a later one supersedes it.
			</p>
		);
	}
	return (
		<ul className="flex min-w-0 flex-col gap-2 px-4 pb-4">
			{standing.rulings.map((ruling) => (
				<StandingRulingCard
					key={ruling.id}
					onError={onError}
					others={standing.rulings.filter((other) => other.id !== ruling.id)}
					ruling={ruling}
				/>
			))}
		</ul>
	);
};

// why: what stands is read newest first, so the latest word about a scope is
// the first one the admiral meets — the same order an asking agent is given.
export const StandingRulings = ({
	error,
	onError,
	standing,
}: {
	readonly error: string | undefined;
	readonly onError: (message: string) => void;
	readonly standing: StandingRulingsView | undefined;
}) => (
	<section className="flex min-w-0 flex-col border-t border-border">
		<header className="flex flex-col gap-1 px-4 pt-3 pb-2">
			<div className="flex items-baseline gap-2">
				<h2 className="text-base">Standing</h2>
				{standing === undefined ? null : (
					<span className="text-2xs text-muted-foreground tabular-nums">
						{standing.rulings.length}
					</span>
				)}
			</div>
			<p className="text-2xs text-muted-foreground">
				What binds the fleet now, newest first. A ruling is never edited; a
				later one supersedes it.
			</p>
		</header>
		<Standing error={error} onError={onError} standing={standing} />
	</section>
);
