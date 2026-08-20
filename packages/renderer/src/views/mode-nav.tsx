import { Anchor, type LucideIcon, Ship, Users } from "lucide-react";
import { Button } from "#components/ui/button.tsx";
import { cn } from "#lib/utils.ts";

// why: the window watches three things — the fleet at work, the voyages the
// work is for, and the quay where finished work waits on a host. They share
// one window, so the rail says which is on show.
export type Mode = "fleet" | "quay" | "voyages";

interface ModeEntry {
	readonly icon: LucideIcon;
	readonly label: string;
	readonly mode: Mode;
}

const MODES: ReadonlyArray<ModeEntry> = [
	{ icon: Users, label: "Fleet", mode: "fleet" },
	{ icon: Ship, label: "Voyages", mode: "voyages" },
	{ icon: Anchor, label: "Quay", mode: "quay" },
];

export const ModeNav = ({
	mode,
	onMode,
}: {
	readonly mode: Mode;
	readonly onMode: (mode: Mode) => void;
}) => (
	<nav className="flex flex-col gap-0.5">
		{MODES.map((offered) => {
			const showing = offered.mode === mode;
			return (
				<Button
					aria-current={showing ? "page" : undefined}
					className={cn(
						"w-full justify-start",
						showing ? undefined : "text-muted-foreground",
					)}
					key={offered.mode}
					onClick={() => onMode(offered.mode)}
					variant={showing ? "secondary" : "ghost"}
				>
					<offered.icon />
					{offered.label}
				</Button>
			);
		})}
	</nav>
);
