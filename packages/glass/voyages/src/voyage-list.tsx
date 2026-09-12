import type { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { cn } from "@antumbra/glass-components/class-names.ts";
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
const VoyageRow = (props: Props & { readonly voyage: typeof voyage.Row.Type }) => (
	<li className="min-w-0">
		<Card
			className={cn("gap-2 transition-colors", props.selected === props.voyage.id ? "border-border-strong bg-accent" : "hover:border-border-strong")}
		>
			<div className="flex min-w-0 items-start gap-1.5">
				<button
					aria-current={props.selected === props.voyage.id ? "true" : undefined}
					className="min-w-0 flex-1 text-left text-xs font-medium"
					onClick={() => props.onSelect(props.voyage.id)}
					type="button"
				>
					{props.voyage.name}
				</button>
				{props.voyage.kind === "flagship" ? <Badge variant="info">Flagship</Badge> : null}
				<VoyageState api={props.api} voyageId={props.voyage.id} />
				<FocusToggle api={props.api} focused={props.voyage.focusedAt !== null} voyageId={props.voyage.id} />
			</div>
			<p className="text-2xs text-muted-foreground">{props.voyage.northStar}</p>
			<VoyageProgress api={props.api} voyageId={props.voyage.id} />
			<CaptainCall api={props.api} onHail={props.onHail} voyageId={props.voyage.id} />
		</Card>
	</li>
);

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
