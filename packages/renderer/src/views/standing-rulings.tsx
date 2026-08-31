import type { StandingRulingsView, StandingRulingView } from "@antumbra/contract";
import { StandingRulingList } from "#views/standing-ruling-list.tsx";

const Stale = ({
	onError,
	stale,
	standing,
}: {
	readonly onError: (message: string) => void;
	readonly stale: ReadonlyArray<StandingRulingView>;
	readonly standing: ReadonlyArray<StandingRulingView>;
}) =>
	stale.length === 0 ? null : (
		<section className="flex min-w-0 flex-col border-t border-border">
			<header className="flex flex-col gap-1 px-4 pt-3 pb-2">
				<h3 className="text-sm">Stale</h3>
				<p className="text-2xs text-muted-foreground">Every piece and voyage these name has finished. They bind until you withdraw them.</p>
			</header>
			<StandingRulingList listed={stale} onError={onError} standing={standing} />
		</section>
	);

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
				{error === undefined ? "reading what stands…" : `standing feed lost: ${error}`}
			</p>
		);
	}
	if (standing.rulings.length === 0) {
		return (
			<p className="px-4 py-3 text-xs text-muted-foreground">
				Nothing stands yet. A ruling stands here from the moment it is ruled until a later one supersedes it or you withdraw it.
			</p>
		);
	}
	const binding = standing.rulings.filter((ruling) => !ruling.stale);
	return (
		<>
			{binding.length === 0 ? null : <StandingRulingList listed={binding} onError={onError} standing={standing.rulings} />}
			<Stale onError={onError} stale={standing.rulings.filter((ruling) => ruling.stale)} standing={standing.rulings} />
		</>
	);
};

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
				{standing === undefined ? null : <span className="text-2xs text-muted-foreground tabular-nums">{standing.rulings.length}</span>}
			</div>
			<p className="text-2xs text-muted-foreground">
				What binds the fleet now, newest first. A ruling is never edited; a later one supersedes it, or the admiral withdraws it.
			</p>
		</header>
		<Standing error={error} onError={onError} standing={standing} />
	</section>
);
