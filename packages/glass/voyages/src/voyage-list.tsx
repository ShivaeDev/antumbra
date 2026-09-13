import type { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { Badge } from "@antumbra/glass-components/shadcn/badge.tsx";
import { Card, CardContent, CardHeader } from "@antumbra/glass-components/shadcn/card.tsx";
import { FocusToggle } from "#focus.tsx";
import type { VoyagesApi } from "#glass.ts";
import { VoyageProgress, VoyageState } from "#progress.tsx";

const NONE = "No voyages are open yet; open one to chart work against a north star.";

interface Props {
	readonly api: VoyagesApi;
	readonly onSelect: (id: string) => void;
}

const VoyageCard = (props: Props & { readonly voyage: typeof voyage.Row.Type }) => (
	<Card className="gap-3">
		<CardHeader>
			<div className="flex min-w-0 items-start gap-2">
				<button
					aria-label={`Open ${props.voyage.name}`}
					className="-m-1 flex min-w-0 flex-1 flex-col gap-1 rounded-md p-1 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60"
					onClick={() => props.onSelect(props.voyage.id)}
					type="button"
				>
					<span className="flex w-full min-w-0 items-center gap-2">
						<span className="min-w-0 truncate text-sm font-medium">{props.voyage.name}</span>
						{props.voyage.kind === "flagship" ? <Badge variant="secondary">Flagship</Badge> : null}
						<span className="ml-auto shrink-0">
							<VoyageState api={props.api} quieted={props.voyage.quietedAt !== null} voyageId={props.voyage.id} />
						</span>
					</span>
					<span className="line-clamp-2 text-xs text-muted-foreground">{props.voyage.northStar}</span>
				</button>
				<div className="shrink-0">
					<FocusToggle api={props.api} focused={props.voyage.focusedAt !== null} voyageId={props.voyage.id} />
				</div>
			</div>
		</CardHeader>
		<CardContent>
			<VoyageProgress api={props.api} voyageId={props.voyage.id} />
		</CardContent>
	</Card>
);

const ordered = (voyages: readonly (typeof voyage.Row.Type)[]): readonly (typeof voyage.Row.Type)[] => [
	...voyages.filter((row) => row.kind === "flagship"),
	...voyages.filter((row) => row.kind !== "flagship"),
];

export const VoyageList = (props: Props) => (
	<Live input={{}} query={props.api.voyages.list} waiting="Reading the voyages…">
		{(voyages) =>
			voyages.length === 0 ? (
				<p className="text-xs text-muted-foreground">{NONE}</p>
			) : (
				<div className="flex min-w-0 flex-col gap-3">
					{ordered(voyages).map((row) => (
						<VoyageCard {...props} key={row.id} voyage={row} />
					))}
				</div>
			)
		}
	</Live>
);
