import type { VoyageSummary } from "@antumbra/contract";
import { OpenVoyageForm } from "#views/open-voyage-form.tsx";
import { VoyagesPanel } from "#views/voyages.tsx";

export const VoyagesAside = ({
	backends,
	onError,
	onSelect,
	selected,
	voyages,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly onError: (message: string) => void;
	readonly onSelect: (voyageId: string) => void;
	readonly selected: string | undefined;
	readonly voyages: ReadonlyArray<VoyageSummary>;
}) => (
	<>
		<OpenVoyageForm backends={backends} onError={onError} onOpened={onSelect} />
		<VoyagesPanel
			onError={onError}
			onSelect={onSelect}
			selected={selected}
			voyages={voyages}
		/>
	</>
);
