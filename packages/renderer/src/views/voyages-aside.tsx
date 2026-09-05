import type { RoleSettings, VoyageSummary } from "@antumbra/contract";
import { OpenVoyageForm } from "#views/open-voyage-form.tsx";
import { SectionHeading } from "#views/section.tsx";
import { VoyagesPanel } from "#views/voyages.tsx";

export const VoyagesAside = ({
	backends,
	defaults,
	onError,
	onSelect,
	selected,
	voyages,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly defaults: ReadonlyArray<RoleSettings>;
	readonly onError: (message: string) => void;
	readonly onSelect: (voyageId: string) => void;
	readonly selected: string | undefined;
	readonly voyages: ReadonlyArray<VoyageSummary>;
}) => (
	<div className="flex min-w-0 flex-col gap-3 font-sans">
		<SectionHeading count={voyages.length} title="Voyages" />
		<OpenVoyageForm backends={backends} defaults={defaults} onError={onError} onOpened={onSelect} />
		<VoyagesPanel onError={onError} onSelect={onSelect} selected={selected} voyages={voyages} />
	</div>
);
