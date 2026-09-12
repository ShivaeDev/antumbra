import { ProviderCapacities } from "@antumbra/glass-capacity/capacity.tsx";
import type { ConsolePlace } from "@antumbra/platform-shell/windows.ts";
import { ConsoleMain } from "#navigation/console-main.tsx";
import { Navigation } from "#navigation/navigation.tsx";
import type { RendererProps } from "#props.ts";

export const ConsoleApp = (props: RendererProps & { readonly place: ConsolePlace; readonly onError: (message: string) => void }) => (
	<Navigation api={props.api} shell={props.shell} place={props.place} onError={props.onError}>
		{(place, onPlace, foldToolCalls) => (
			<>
				<ProviderCapacities api={props.api} />
				<ConsoleMain {...props} place={place} onPlace={onPlace} foldToolCalls={foldToolCalls} />
			</>
		)}
	</Navigation>
);
