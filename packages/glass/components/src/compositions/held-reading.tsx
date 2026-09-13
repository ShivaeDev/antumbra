import { useReconnecting } from "@antumbra/glass-client/reconnection.tsx";
import type { ReactNode } from "react";
import { cn } from "#class-names.ts";

export const HeldReading = ({ children, className }: { readonly children: ReactNode; readonly className?: string }) => {
	const holding = useReconnecting();
	return (
		<div aria-busy={holding} className={cn(className, holding ? "opacity-60" : undefined)} inert={holding}>
			{children}
		</div>
	);
};
