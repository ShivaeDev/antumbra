import type { ChangeRow } from "@antumbra/domain-changes/rows/change.ts";
import { adoptExternal } from "@antumbra/domain-changes/runtime/adopt.ts";
import { prepareLocal } from "@antumbra/domain-changes/runtime/prepare.ts";
import { openLocal } from "@antumbra/domain-changes/runtime/publish.ts";
import { answered, onPiece } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { requestId } from "@antumbra/platform-tool-schemas/request.ts";
import { adoptChangeSpec, openChangeSpec, submitChangeSpec } from "#tools/changes/specs.ts";

const said = (row: ChangeRow): string => `change ${row.stage}: ${row.url ?? "no url"} (id ${row.id})`;
export const changesTools = [
	bind(submitChangeSpec, (context, input) =>
		onPiece(context, (pieceId) =>
			answered(context, submitChangeSpec.name, prepareLocal({ ...context, callId: requestId(context), pieceId, repo: input.repo }), said),
		),
	),
	bind(openChangeSpec, (context, input) =>
		onPiece(context, (pieceId) =>
			answered(
				context,
				openChangeSpec.name,
				openLocal({
					...context,
					callId: requestId(context),
					pieceId,
					repo: input.repo,
					title: input.title,
					body: input.body,
					base: input.base ?? null,
					draft: input.draft ?? false,
				}),
				said,
			),
		),
	),
	bind(adoptChangeSpec, (context, input) =>
		onPiece(context, (pieceId) =>
			answered(
				context,
				adoptChangeSpec.name,
				adoptExternal({ ...context, callId: requestId(context), pieceId, repo: input.repo, url: input.url }),
				said,
			),
		),
	),
] as const;
