import { contentClient } from "@antumbra/glass-artifacts/content-client.ts";
import { type Dialing, dialing } from "@antumbra/glass-client/serving.ts";
import { inputsClient } from "@antumbra/glass-inputs/client.ts";
import { sessionsClient } from "@antumbra/glass-sessions/client.ts";
import type { ShellBridge } from "@antumbra/platform-shell/bridge.ts";
import { Effect, type Scope } from "effect";
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

export type Connecting = Effect.Effect<RendererGlass, never, Dialing | Scope.Scope>;

export const mount = (container: HTMLElement, bridge: ShellBridge, connecting: Connecting) =>
	Effect.gen(function* () {
		const glass = yield* connecting;
		yield* Effect.addFinalizer(() => Effect.sync(() => glass.registry.dispose()));
		const inputs = yield* inputsClient;
		const sessions = yield* sessionsClient;
		const readArtifact = yield* contentClient;
		const root = createRoot(container);
		yield* Effect.addFinalizer(() => Effect.sync(() => root.unmount()));
		root.render(
			<glass.Provider>
				<Surface api={glass.api} shell={shellOf(bridge)} inputs={inputs} sessions={sessions} drafts={draftsOf(bridge)} readArtifact={readArtifact} />
			</glass.Provider>,
		);
		return yield* Effect.never;
	}).pipe(Effect.provide(dialing(reachOf(bridge))));
