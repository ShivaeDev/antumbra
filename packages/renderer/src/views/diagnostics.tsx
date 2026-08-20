import type {
	AgentDiagnostics,
	FleetDiagnostics,
	IntentDiagnostic,
	SessionDiagnostics,
} from "@antumbra/contract";
import { Badge } from "#components/ui/badge.tsx";

// why: diagnostics are for the admiral who goes looking, so a chip stays
// monospace and unaccented, which is how raw stored words read as raw rather
// than as product language.
const Chip = ({ children }: { readonly children: string }) => (
	<Badge className="font-mono" variant="outline">
		{children}
	</Badge>
);

// why: the raw words go out unedited. A chip that paraphrased stored state
// would be another projection to distrust, which is the thing it exists to
// remove.
const IntentChips = ({
	intents,
}: {
	readonly intents: ReadonlyArray<IntentDiagnostic>;
}) => (
	<>
		{intents.map((intent) => (
			<Chip key={intent.id}>{`intent: ${intent.kind} ${intent.state}`}</Chip>
		))}
	</>
);

export const AgentDiagChips = ({
	diag,
}: {
	readonly diag: AgentDiagnostics;
}) => (
	<>
		<Chip>{`current ${diag.currentSessionId?.slice(0, 8) ?? "none"}`}</Chip>
		<IntentChips intents={diag.intents} />
	</>
);

export const SessionDiagChips = ({
	diag,
}: {
	readonly diag: SessionDiagnostics;
}) => (
	<>
		<Chip>{diag.current ? `${diag.execution} · current` : diag.execution}</Chip>
		<IntentChips intents={diag.intents} />
	</>
);

// why: an Intent whose Agent or Session row does not exist yet has nowhere to
// sit on the list, and those are the ones a stalled fleet is made of.
export const FleetDiagChips = ({
	diag,
}: {
	readonly diag: FleetDiagnostics;
}) =>
	diag.intents.length === 0 ? null : (
		<div className="flex min-w-0 flex-wrap items-center gap-1">
			<IntentChips intents={diag.intents} />
		</div>
	);
