import type { OpenRulingsView, RulingView } from "@antumbra/contract";
import { watchOpenRulings, watchStandingRulings } from "#adapters/trpc-rulings.ts";
import { useFeed } from "#hooks/feed.ts";
import { RulingCard } from "#views/ruling-card.tsx";
import { RulingProclaim } from "#views/ruling-proclaim.tsx";
import { StandingRulings } from "#views/standing-rulings.tsx";

interface VoyageGroup {
	readonly key: string;
	readonly name: string;
	readonly rulings: ReadonlyArray<RulingView>;
}

const FLEET = { key: "", name: "The fleet" };

const byVoyage = (rulings: ReadonlyArray<RulingView>): ReadonlyArray<VoyageGroup> => {
	const groups = new Map<string, VoyageGroup>();
	for (const ruling of rulings) {
		const named = ruling.voyage === null ? FLEET : { key: ruling.voyage.id, name: ruling.voyage.name };
		const group = groups.get(named.key) ?? { ...named, rulings: [] };
		groups.set(named.key, { ...group, rulings: [...group.rulings, ruling] });
	}
	return [...groups.values()];
};

const Header = ({ open }: { readonly open: OpenRulingsView }) => (
	<header className="flex flex-col gap-1 border-b border-border px-4 py-3">
		<div className="flex items-baseline gap-2">
			<h2 className="text-base">The rulings</h2>
			<span className="text-2xs text-muted-foreground tabular-nums">{open.rulings.length}</span>
		</div>
		<p className="text-2xs text-muted-foreground">Open questions from the fleet, voyage by voyage, in the order they should be answered.</p>
	</header>
);

const RulingList = ({ listed, onError }: { readonly listed: ReadonlyArray<RulingView>; readonly onError: (message: string) => void }) => (
	<div className="flex min-w-0 flex-col gap-3 p-4">
		{byVoyage(listed).map((group) => (
			<section aria-label={group.name} className="flex min-w-0 flex-col gap-2" key={group.key}>
				<h3 className="text-sm">{group.name}</h3>
				<ul className="flex min-w-0 flex-col gap-2">
					{group.rulings.map((ruling) => (
						<RulingCard key={ruling.id} onError={onError} ruling={ruling} />
					))}
				</ul>
			</section>
		))}
	</div>
);

const Parked = ({ onError, parked }: { readonly onError: (message: string) => void; readonly parked: ReadonlyArray<RulingView> }) =>
	parked.length === 0 ? null : (
		<section className="flex min-w-0 flex-col border-t border-border">
			<header className="flex flex-col gap-1 px-4 pt-3 pb-2">
				<h3 className="text-sm">Not now</h3>
				<p className="text-2xs text-muted-foreground">Left for a later moment. Nothing waits on them; ruling one brings it back.</p>
			</header>
			<ul className="flex min-w-0 flex-col gap-2 px-4 pb-4">
				{parked.map((ruling) => (
					<RulingCard key={ruling.id} onError={onError} ruling={ruling} />
				))}
			</ul>
		</section>
	);

const OpenRulings = ({ onError, open }: { readonly onError: (message: string) => void; readonly open: OpenRulingsView }) => {
	const waiting = open.rulings.filter((ruling) => ruling.parked === null);
	return open.rulings.length === 0 ? (
		<p className="m-auto max-w-sm px-6 text-center text-xs text-muted-foreground">
			Nothing is waiting on you. A ruling appears here the moment an agent asks for one.
		</p>
	) : (
		<>
			{waiting.length === 0 ? null : <RulingList listed={waiting} onError={onError} />}
			<Parked onError={onError} parked={open.rulings.filter((ruling) => ruling.parked !== null)} />
		</>
	);
};

export const RulingsPanel = ({ onError }: { readonly onError: (message: string) => void }) => {
	const { error: feedError, value: open } = useFeed("rulings", watchOpenRulings);
	const standing = useFeed("standing-rulings", watchStandingRulings);

	if (open === undefined) {
		return (
			<section aria-live="polite" className="m-auto text-xs text-muted-foreground">
				{feedError === undefined ? "taking a sight…" : `feed lost: ${feedError}`}
			</section>
		);
	}
	return (
		<section className="flex min-w-0 flex-1 flex-col bg-background font-sans text-foreground">
			<Header open={open} />
			{feedError === undefined ? null : (
				<p className="border-b border-destructive/30 bg-destructive/10 px-4 py-1.5 text-xs text-destructive" role="alert">
					feed lost: {feedError}
				</p>
			)}
			<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
				<RulingProclaim onError={onError} />
				<OpenRulings onError={onError} open={open} />
				<StandingRulings error={standing.error} onError={onError} standing={standing.value} />
			</div>
		</section>
	);
};
