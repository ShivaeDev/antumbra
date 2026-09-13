import type { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { cn } from "@antumbra/glass-components/class-names.ts";
import { SUBJECT } from "@antumbra/glass-components/classes.ts";
import { Badge } from "@antumbra/glass-components/ui/badge.tsx";
import { Card } from "@antumbra/glass-components/ui/card.tsx";
import { CaptainCall } from "#captain.tsx";
import type { VoyagesDisplayApi } from "#display.ts";
import { FocusToggle } from "#focus.tsx";
import { VoyageProgress, VoyageState } from "#progress.tsx";

interface Props {
	readonly api: VoyagesDisplayApi;
	readonly selected?: string | undefined;
	readonly onSelect: (id: string) => void;
	readonly onHail: (id: string) => void;
}
const VoyageRow = (props: Props & { readonly voyage: typeof voyage.Row.Type }) => {
	const showing = props.selected === props.voyage.id;
	return (
		<li className="min-w-0">
			<Card className={cn("relative gap-0 p-0 transition-colors", showing ? "border-border-strong bg-accent" : "hover:border-border-strong")}>
				<button
					aria-current={showing ? "true" : undefined}
					aria-label={`Open ${props.voyage.name}`}
					className={cn(SUBJECT, "gap-2 px-2.5 py-2 pr-9")}
					onClick={() => props.onSelect(props.voyage.id)}
					type="button"
				>
					<span className="flex min-w-0 items-start gap-1.5">
						<span className="min-w-0 flex-1 text-xs font-medium">{props.voyage.name}</span>
						{props.voyage.kind === "flagship" ? <Badge variant="info">Flagship</Badge> : null}
						<VoyageState api={props.api} voyageId={props.voyage.id} />
					</span>
					<span className="text-2xs text-muted-foreground">{props.voyage.northStar}</span>
					<VoyageProgress api={props.api} voyageId={props.voyage.id} />
				</button>
				<span className="absolute top-1 right-1">
					<FocusToggle api={props.api} focused={props.voyage.focusedAt !== null} voyageId={props.voyage.id} />
				</span>
				<div className="px-2.5 pb-2">
					<CaptainCall api={props.api} onHail={props.onHail} voyageId={props.voyage.id} />
				</div>
			</Card>
		</li>
	);
};

export const VoyageList = (props: Props) => (
	<Live input={{}} query={props.api.voyages.list}>
		{(voyages) =>
			voyages.length === 0 ? (
				<p className="text-2xs text-muted-foreground">No voyages open yet — open one to chart work against a north star</p>
			) : (
				<ul className="flex min-w-0 flex-col gap-1.5">
					{[...voyages.filter((voyage) => voyage.kind === "flagship"), ...voyages.filter((voyage) => voyage.kind !== "flagship")].map((voyage) => (
						<VoyageRow {...props} key={voyage.id} voyage={voyage} />
					))}
				</ul>
			)
		}
	</Live>
);
