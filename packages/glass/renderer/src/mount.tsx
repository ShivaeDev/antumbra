import { contentClient } from "@antumbra/glass-artifacts/content-client.ts";
import { dialing } from "@antumbra/glass-client/serving.ts";
import { inputsClient } from "@antumbra/glass-inputs/client.ts";
import { sessionsClient } from "@antumbra/glass-sessions/client.ts";
import type { ShellBridge } from "@antumbra/platform-shell/bridge.ts";
import { Effect } from "effect";
import type * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { draftsOf, reachOf, shellOf } from "#adapters/shell.ts";
import type { RendererApi } from "#api.ts";
import { Surface } from "#surface.tsx";

export interface RendererGlass {
	readonly api: RendererApi;
	readonly Provider: (props: { readonly children?: ReactNode }) => ReactNode;
	readonly registry: AtomRegistry.AtomRegistry;
}

export const mount = (container: HTMLElement, bridge: ShellBridge, glass: RendererGlass) =>
	Effect.gen(function* () {
		const reach = reachOf(bridge);
		yield* Effect.addFinalizer(() => Effect.sync(() => glass.registry.dispose()));
		const inputs = yield* inputsClient(reach);
		const sessions = yield* sessionsClient(reach);
		const readArtifact = yield* contentClient.pipe(Effect.provide(dialing(reach)));
		const root = createRoot(container);
		yield* Effect.addFinalizer(() => Effect.sync(() => root.unmount()));
		root.render(
			<glass.Provider>
				<Surface api={glass.api} shell={shellOf(bridge)} inputs={inputs} sessions={sessions} drafts={draftsOf(bridge)} readArtifact={readArtifact} />
			</glass.Provider>,
		);
		return yield* Effect.never;
	});
