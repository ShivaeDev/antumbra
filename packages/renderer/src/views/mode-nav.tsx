import type { ConsoleMode } from "@antumbra/contract";
import { Anchor, Flag, Gavel, type LucideIcon, Pause, Settings, Ship, Users } from "lucide-react";
import { Button } from "#components/ui/button.tsx";
import { cn } from "#lib/utils.ts";

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
	{ icon: Pause, label: "Holds", mode: "holds" },
	{ icon: Settings, label: "Settings", mode: "settings" },
];

export const ModeNav = ({
	held,
	mode,
	onMode,
}: {
	readonly held: boolean;
	readonly mode: ConsoleMode;
	readonly onMode: (mode: ConsoleMode) => void;
}) => (
	<nav className="flex flex-col gap-0.5">
		{MODES.map((offered) => {
			const showing = offered.mode === mode;
			return (
				<Button
					aria-current={showing ? "page" : undefined}
					className={cn("w-full justify-start", showing ? undefined : "text-muted-foreground")}
					key={offered.mode}
					onClick={() => onMode(offered.mode)}
					variant={showing ? "secondary" : "ghost"}
				>
					<offered.icon />
					{offered.label}
					{held && offered.mode === "holds" ? (
						<span className="ml-auto rounded-sm border border-border px-1 py-px text-2xs text-foreground">held</span>
					) : null}
				</Button>
			);
		})}
	</nav>
);
