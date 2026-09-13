import { cn } from "@antumbra/glass-components/class-names.ts";
import { StatusBadge } from "@antumbra/glass-components/compositions/status-badge.tsx";
import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import type { VoyagesApi } from "@antumbra/glass-voyages/glass.ts";
import type { ConsoleMode } from "@antumbra/platform-shell/windows.ts";
import { Anchor, Coins, Flag, Gavel, type LucideIcon, Pause, Settings, Ship, TriangleAlert, Users } from "lucide-react";
import { RecentVoyages } from "#navigation/recent-voyages.tsx";

interface ModeEntry {
	readonly icon: LucideIcon;
	readonly label: string;
	readonly mode: ConsoleMode;
}

const MODES: ReadonlyArray<ModeEntry> = [
	{ icon: Flag, label: "Flagship", mode: "flagship" },
	{ icon: Users, label: "Fleet", mode: "fleet" },
	{ icon: Ship, label: "Voyages", mode: "voyages" },
	{ icon: Anchor, label: "Quay", mode: "quay" },
	{ icon: Gavel, label: "Rulings", mode: "rulings" },
	{ icon: Coins, label: "Costs", mode: "costs" },
	{ icon: Pause, label: "Holds", mode: "holds" },
	{ icon: Settings, label: "Settings", mode: "settings" },
	{ icon: TriangleAlert, label: "Errors", mode: "errors" },
];

const ModeButton = ({
	entry,
	held,
	onMode,
	showing,
}: {
	readonly entry: ModeEntry;
	readonly held: boolean;
	readonly onMode: (mode: ConsoleMode) => void;
	readonly showing: boolean;
}) => (
	<Button
		aria-current={showing ? "page" : undefined}
		className={cn("w-full justify-start", showing ? "bg-accent text-accent-foreground" : "text-muted-foreground")}
		onClick={() => onMode(entry.mode)}
		size="sm"
		variant="ghost"
	>
		<entry.icon className="text-muted-foreground" />
		{entry.label}
		{held && entry.mode === "holds" ? (
			<span className="ml-auto">
				<StatusBadge state="held" />
			</span>
		) : null}
	</Button>
);

export const ModeNav = ({
	api,
	held,
	mode,
	onMode,
	onVoyage,
	recent,
}: {
	readonly api: VoyagesApi;
	readonly held: boolean;
	readonly mode: ConsoleMode;
	readonly onMode: (mode: ConsoleMode) => void;
	readonly onVoyage: (voyageId: string) => void;
	readonly recent: readonly string[];
}) => (
	<nav className="flex flex-col gap-0.5">
		{MODES.map((entry) => {
			const item = <ModeButton entry={entry} held={held} onMode={onMode} showing={entry.mode === mode} />;
			if (entry.mode !== "voyages" || recent.length === 0) return <div key={entry.mode}>{item}</div>;
			return <RecentVoyages api={api} item={item} key={entry.mode} onVoyage={onVoyage} recent={recent} />;
		})}
	</nav>
);
