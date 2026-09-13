import { CommandForm } from "@antumbra/glass-components/form.tsx";
import type { ReactNode } from "react";
import type { VoyagesApi } from "#glass.ts";

const FIXED = { kind: "voyage" } as const;

const SUBMIT = "Open voyage";

export const OpenVoyage = (props: { readonly api: VoyagesApi; readonly onOpened: () => void }): ReactNode => (
	<CommandForm command={props.api.voyages.open} fixed={FIXED} heading={false} sent={props.onOpened} submit={SUBMIT} titles />
);
