import { Live } from "@antumbra/glass-client/live.tsx";
import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@antumbra/glass-components/shadcn/collapsible.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@antumbra/glass-components/shadcn/tooltip.tsx";
import type { VoyagesApi } from "@antumbra/glass-voyages/glass.ts";
import { ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";

const OPENED = "Voyages opened";

const OpenedVoyage = ({ name, onOpen }: { readonly name: string; readonly onOpen: () => void }) => (
	<Tooltip>
		<TooltipTrigger asChild>
			<Button className="w-full justify-start pl-8 text-muted-foreground" onClick={onOpen} size="sm" variant="ghost">
				<span className="min-w-0 truncate">{name}</span>
			</Button>
		</TooltipTrigger>
		<TooltipContent side="right">{name}</TooltipContent>
	</Tooltip>
);

export const RecentVoyages = (props: {
	readonly api: VoyagesApi;
	readonly item: ReactNode;
	readonly onVoyage: (voyageId: string) => void;
	readonly recent: readonly string[];
}) => (
	<Collapsible className="group">
		<div className="flex min-w-0 items-center gap-0.5">
			<div className="min-w-0 flex-1">{props.item}</div>
			<CollapsibleTrigger asChild>
				<Button aria-label={OPENED} className="shrink-0" size="icon-sm" variant="ghost">
					<ChevronRightIcon className="text-muted-foreground group-data-[state=open]:rotate-90" />
				</Button>
			</CollapsibleTrigger>
		</div>
		<CollapsibleContent className="flex min-w-0 flex-col gap-0.5 pt-0.5">
			<Live input={{}} query={props.api.voyages.list} waiting="Reading the voyages…">
				{(voyages) => {
					const opened = [];
					for (const voyageId of props.recent) {
						const found = voyages.find((voyage) => voyage.id === voyageId);
						if (found !== undefined) opened.push(found);
					}
					return opened.map((voyage) => <OpenedVoyage key={voyage.id} name={voyage.name} onOpen={() => props.onVoyage(voyage.id)} />);
				}}
			</Live>
		</CollapsibleContent>
	</Collapsible>
);
