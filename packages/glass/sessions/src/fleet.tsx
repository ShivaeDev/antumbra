import { Live } from "@antumbra/glass-client/live.tsx";
import { cn } from "@antumbra/glass-components/class-names.ts";
import { PageHeader } from "@antumbra/glass-components/compositions/page-header.tsx";
import { ScrollArea } from "@antumbra/glass-components/shadcn/scroll-area.tsx";
import { ReposDialog } from "@antumbra/glass-repos/repos-dialog.tsx";
import type { ReactNode } from "react";
import type { SessionsApi } from "#glass.ts";
import { Roster } from "#roster.tsx";
import { SpawnDialog } from "#spawn-dialog.tsx";

const NO_AGENTS = "No agents yet — spawn one to put it here";

const BAND = "flex h-12 shrink-0 items-center justify-between gap-2 border-b px-6";

interface Props {
	readonly api: SessionsApi;
	readonly sessionId?: string | undefined;
	readonly onSession: (id: string) => void;
	readonly onOpenTranscript?: ((id: string) => void) | undefined;
	readonly onPiece: (voyageId: string, pieceId: string) => void;
	readonly onVoyage: (id: string) => void;
}

const Band = ({ actions }: { readonly actions: ReactNode }) => (
	<header className={BAND}>
		<h1 className="min-w-0 truncate text-sm font-medium">Fleet</h1>
		<div className="flex shrink-0 items-center gap-2">{actions}</div>
	</header>
);

export const FleetPanel = (props: Props) => {
	const beside = props.sessionId !== undefined;
	const actions = (
		<>
			<ReposDialog api={props.api} />
			<SpawnDialog api={props.api} />
		</>
	);
	return (
		<section className="flex min-h-0 min-w-0 flex-1 flex-col">
			{beside ? (
				<Band actions={actions} />
			) : (
				<div className="shrink-0 px-6 pt-5">
					<PageHeader actions={actions} title="Fleet" />
				</div>
			)}
			<ScrollArea className="min-h-0 flex-1">
				<div className={cn("space-y-8 px-6 pb-10", beside ? "pt-4" : undefined)}>
					<Live query={props.api.agents.roster} input={{}} waiting="Reading the fleet…">
						{(agents) => (agents.length === 0 ? <p className="text-xs text-muted-foreground">{NO_AGENTS}</p> : <Roster {...props} agents={agents} />)}
					</Live>
				</div>
			</ScrollArea>
		</section>
	);
};
