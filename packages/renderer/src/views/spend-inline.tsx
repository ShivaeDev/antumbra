import type { UsageTotal } from "@antumbra/contract";
import { compactTokens, costPhrase, costTitle, tokensOf, tokensTitle } from "#costs/format.ts";

export const SpendInline = ({ total }: { readonly total: UsageTotal }) => (
	<>
		<span title={tokensTitle(total)}>{compactTokens(tokensOf(total))} tokens</span>
		<span>·</span>
		<span title={costTitle(total)}>{costPhrase(total)}</span>
	</>
);
