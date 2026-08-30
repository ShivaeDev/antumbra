import {
	AGENT_BACKEND_TAGS,
	type VoyageBackendRequest,
	type VoyageCaptainView,
	type VoyageSummary,
} from "@antumbra/contract";
import { PinIcon } from "lucide-react";
import { focusVoyage, hailCaptain } from "#adapters/trpc-voyages.ts";
import { Button } from "#components/ui/button.tsx";
import { cn } from "#lib/utils.ts";
import { captainAtWork } from "#voyages/acts.ts";
import { captainCallLabel } from "#voyages/labels.ts";

// why: focus is a standing mark on a voyage rather than a thing you read, so
// it is a filled pin you can find at a glance instead of a word that has to be
// read against its opposite.
export const FocusToggle = ({
	onError,
	voyage,
}: {
	readonly onError: (message: string) => void;
	readonly voyage: VoyageSummary;
}) => {
	const focused = voyage.focusedAt !== null;
	const label = focused ? "Drop focus" : "Focus this voyage";
	return (
		<Button
			aria-label={label}
			aria-pressed={focused}
			className="shrink-0"
			onClick={() => focusVoyage(voyage.id, !focused, onError)}
			size="icon"
			title={label}
			type="button"
			variant="ghost"
		>
			<PinIcon
				className={cn(
					focused ? "fill-current text-foreground" : "text-muted-foreground",
				)}
			/>
		</Button>
	);
};

// why: a backend is a standing choice with settled answers, so all of them are
// on show with the current one pressed — a switch retargets the spawns the
// voyage has yet to make, never the crew already sailing under it. The captain
// and the crew are seated by two of these, so each says whose seat it is.
export const BackendSwitch = ({
	onError,
	sailing,
	seat,
	seatBackend,
	voyageId,
}: {
	readonly onError: (message: string) => void;
	readonly sailing: string;
	readonly seat: string;
	readonly seatBackend: (
		request: VoyageBackendRequest,
		onError: (message: string) => void,
	) => void;
	readonly voyageId: string;
}) => (
	<fieldset className="flex shrink-0 items-center gap-0.5 rounded-md border border-border p-0.5">
		<legend className="sr-only">{seat}</legend>
		<span className="px-1 text-2xs text-muted-foreground">{seat}</span>
		{AGENT_BACKEND_TAGS.map((tag) => (
			<Button
				aria-pressed={sailing === tag}
				key={tag}
				onClick={() => seatBackend({ backend: tag, voyageId }, onError)}
				size="sm"
				type="button"
				variant={sailing === tag ? "secondary" : "ghost"}
			>
				{tag}
			</Button>
		))}
	</fieldset>
);

export const CaptainCall = ({
	captain,
	onError,
	voyageId,
}: {
	readonly captain: VoyageCaptainView | null;
	readonly onError: (message: string) => void;
	readonly voyageId: string;
}) => {
	if (!captainAtWork(captain)) {
		return (
			<Button
				onClick={() => hailCaptain(voyageId, onError)}
				size="sm"
				type="button"
				variant="outline"
			>
				{captainCallLabel(captain)}
			</Button>
		);
	}
	return (
		<span className="flex min-w-0 items-center gap-1.5 text-2xs text-muted-foreground">
			<span className="shrink-0">Captain</span>
			<span className="truncate font-mono">{captain.agentId.slice(0, 8)}</span>
			<span className="shrink-0">· {captain.status}</span>
		</span>
	);
};
