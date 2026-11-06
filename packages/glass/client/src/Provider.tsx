import { RegistryContext } from "@effect/atom-react";
import type { ActiveClient } from "@shivaedev/contract/clientActivity.ts";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";
import type { ReactNode } from "react";
import { ClientConnection } from "#connection.ts";
import { type Wiring, WiringContext } from "#wiring.ts";

export interface GlassConnection {
	readonly client?: ActiveClient;
	readonly registry: AtomRegistry.AtomRegistry;
	readonly wiring: Wiring;
}

export const Provider = ({ connection, children }: { readonly connection: GlassConnection; readonly children?: ReactNode }) => (
	<RegistryContext.Provider value={connection.registry}>
		<WiringContext.Provider value={connection.wiring}>
			{connection.client === undefined ? children : <ClientConnection value={connection.client}>{children}</ClientConnection>}
		</WiringContext.Provider>
	</RegistryContext.Provider>
);
