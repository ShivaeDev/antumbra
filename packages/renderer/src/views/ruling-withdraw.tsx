import type { StandingRulingView } from "@antumbra/contract";
import { withdrawRuling } from "#adapters/trpc-rulings.ts";
import { RulingNoteForm } from "#views/ruling-note-form.tsx";

export const RulingWithdraw = ({ ruling }: { readonly ruling: StandingRulingView }) => (
	<RulingNoteForm request={withdrawRuling} label="Withdraw because…" rulingId={ruling.id} words="Withdraw" pending="Withdrawing…" />
);
