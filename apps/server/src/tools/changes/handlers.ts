import type { ChangeRow } from "@antumbra/domain-changes/rows/change.ts";
import { answered, onPiece } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { adoptExternal } from "#changes/adopt.ts";
import { prepareLocal } from "#changes/prepare.ts";
import { openLocal } from "#changes/publish.ts";
import { adoptChangeSpec, openChangeSpec, submitChangeSpec } from "#tools/changes/specs.ts";

const said = (row: ChangeRow): string => `change ${row.stage}: ${row.url ?? "no url"} (id ${row.id})`;

const submitChangeTool = bind(submitChangeSpec, (context, input) =>
	onPiece(context, (pieceId) =>
		answered(context, submitChangeSpec.name, prepareLocal({ ...context, callId: requestId(context), pieceId, repo: input.repo }), said),
	),
);

const openChangeTool = bind(openChangeSpec, (context, input) =>
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
);

const adoptChangeTool = bind(adoptChangeSpec, (context, input) =>
	onPiece(context, (pieceId) =>
		answered(
			context,
			adoptChangeSpec.name,
			adoptExternal({ ...context, callId: requestId(context), pieceId, repo: input.repo, url: input.url }),
			said,
		),
	),
);

export const changesTools = [submitChangeTool, openChangeTool, adoptChangeTool] as const;
