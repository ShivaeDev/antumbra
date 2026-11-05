import { type ActiveClient, Activity } from "@shivaedev/contract/clientActivity.ts";
import { useConnectionStatus } from "@shivaedev/react/client/adapters/useConnectionStatus.ts";
import { Effect, Stream } from "effect";
import * as Atom from "effect/reactivity/Atom";
import { createContext, useContext } from "react";

export const RECONNECTING = "Reconnecting to the server…";
const live = { connectionStatus: "live" as const, liveHints: 0, liveInvalidations: 0, refreshingAtoms: 0, rpcCalls: 0 };
const idle = {
	[Activity]: Object.assign(Stream.succeed(live), { connectionStatus: Atom.make(live.connectionStatus), current: Effect.succeed(live) }),
};
export const ClientConnection = createContext<ActiveClient>(idle);
export const useReconnecting = () => useConnectionStatus(useContext(ClientConnection)) !== "live";

const Notice = ({ client, className }: { readonly client: ActiveClient; readonly className?: string | undefined }) => {
	const status = useConnectionStatus(client);
	return (
		<span className={className} role="status">
			{status === "live" ? null : RECONNECTING}
		</span>
	);
};

export const Reconnecting = ({ className }: { readonly className?: string }) => {
	const client = useContext(ClientConnection);
	return client === undefined ? null : <Notice client={client} className={className} />;
};
