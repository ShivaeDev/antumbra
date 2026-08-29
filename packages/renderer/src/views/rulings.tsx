import type { OpenRulingsView } from "@antumbra/contract";
import {
	watchOpenRulings,
	watchStandingRulings,
} from "#adapters/trpc-rulings.ts";
import { useFeed } from "#hooks/feed.ts";
import { RulingCard } from "#views/ruling-card.tsx";
import { StandingRulings } from "#views/standing-rulings.tsx";

const Header = ({ open }: { readonly open: OpenRulingsView }) => (
	<header className="flex flex-col gap-1 border-b border-border px-4 py-3">
		<div className="flex items-baseline gap-2">
			<h2 className="text-base">The rulings</h2>
			<span className="text-2xs text-muted-foreground tabular-nums">
				{open.rulings.length}
			</span>
		</div>
		<p className="text-2xs text-muted-foreground">
			Open questions from the fleet, in the order they should be answered.
		</p>
	</header>
);

// why: the order is the record's — what holds an asker first, then what binds
// most widely, then what has waited longest — so the list never sorts again.
const RulingList = ({
	onError,
	open,
}: {
	readonly onError: (message: string) => void;
	readonly open: OpenRulingsView;
}) =>
	open.rulings.length === 0 ? (
		<p className="m-auto max-w-sm px-6 text-center text-xs text-muted-foreground">
			Nothing is waiting on you. A ruling appears here the moment an agent asks
			for one.
		</p>
	) : (
		<ul className="flex min-w-0 flex-col gap-2 p-4">
			{open.rulings.map((ruling) => (
				<RulingCard key={ruling.id} onError={onError} ruling={ruling} />
			))}
		</ul>
	);

export const RulingsPanel = ({
	onError,
}: {
	readonly onError: (message: string) => void;
}) => {
	const { error: feedError, value: open } = useFeed(
		"rulings",
		watchOpenRulings,
	);
	const standing = useFeed("standing-rulings", watchStandingRulings);

	if (open === undefined) {
		return (
			<section
				aria-live="polite"
				className="m-auto text-xs text-muted-foreground"
			>
				{feedError === undefined
					? "taking a sight…"
					: `feed lost: ${feedError}`}
			</section>
		);
	}
	return (
		<section className="flex min-w-0 flex-1 flex-col bg-background font-sans text-foreground">
			<Header open={open} />
			{feedError === undefined ? null : (
				<p
					className="border-b border-destructive/30 bg-destructive/10 px-4 py-1.5 text-xs text-destructive"
					role="alert"
				>
					feed lost: {feedError}
				</p>
			)}
			<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
				<RulingList onError={onError} open={open} />
				<StandingRulings
					error={standing.error}
					onError={onError}
					standing={standing.value}
				/>
			</div>
		</section>
	);
};
