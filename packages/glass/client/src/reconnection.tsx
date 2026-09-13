import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const RECONNECTING = "Reconnecting to the server…";

interface Reconnection {
	readonly holding: boolean;
	readonly hold: () => () => void;
}

const alone: Reconnection = { holding: false, hold: () => () => undefined };

const ReconnectionContext = createContext<Reconnection>(alone);

export const Reconnections = ({ children }: { readonly children?: ReactNode }) => {
	const [holders, setHolders] = useState(0);
	const hold = useCallback(() => {
		setHolders((count) => count + 1);
		return () => setHolders((count) => count - 1);
	}, []);
	const holding = holders > 0;
	const reconnection = useMemo(() => ({ holding, hold }), [holding, hold]);
	return <ReconnectionContext value={reconnection}>{children}</ReconnectionContext>;
};

export const useHolding = (held: boolean): void => {
	const { hold } = useContext(ReconnectionContext);
	useEffect(() => (held ? hold() : undefined), [held, hold]);
};

export const Holding = ({ children, held }: { readonly children: ReactNode; readonly held: boolean }) => {
	useHolding(held);
	return children;
};

export const useReconnecting = (): boolean => useContext(ReconnectionContext).holding;

export const Reconnecting = ({ className }: { readonly className?: string }) => {
	const reconnecting = useReconnecting();
	return (
		<span className={className} role="status">
			{reconnecting ? RECONNECTING : null}
		</span>
	);
};
