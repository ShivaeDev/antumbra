import type { Fleet } from "@antumbra/contract";
import { ReposDialog } from "#views/repos-dialog.tsx";
import { SpawnDialog } from "#views/spawn-dialog.tsx";

// why: spawning an agent and mooring a repository are things the admiral does
// now and then, so they wait behind a button instead of standing open in front
// of the roster the page exists to show.
export const FleetToolbar = ({ fleet, onError }: { readonly fleet: Fleet | undefined; readonly onError: (message: string) => void }) => (
	<div className="flex flex-wrap items-center gap-2">
		<h2 className="min-w-0 flex-1 text-base">Fleet</h2>
		<ReposDialog onError={onError} repos={fleet?.repos ?? []} />
		<SpawnDialog backends={fleet?.backends ?? []} onError={onError} />
	</div>
);
