import ts from "typescript";
import { type Inventory, isDeclaration, type SourceFile } from "#lint/inventory.ts";
import { allowanceOf, mayImport, placementOf } from "#lint/rules/layout-groups.ts";
import type { Violation } from "#lint/violation.ts";
import { packageOf, type WorkspacePackage, workspacePackages } from "#lint/workspace.ts";

const RULE = "layout/dependency-direction";
const SCOPE = "@antumbra/";

const OLD_IMPORT_EXCEPTIONS: readonly { readonly from: string; readonly to: string }[] = [];

interface Specifier {
	readonly line: number;
	readonly text: string;
}

const specifiersOf = (file: SourceFile): readonly Specifier[] => {
	const source = ts.createSourceFile(
		file.path,
		file.lines.join("\n"),
		ts.ScriptTarget.Latest,
		true,
		file.path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);
	const found: Specifier[] = [];
	const record = (node: ts.Node | undefined) => {
		if (node !== undefined && ts.isStringLiteralLike(node) && node.text.startsWith(SCOPE)) {
			found.push({
				line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
				text: node.text,
			});
		}
	};
	const visit = (node: ts.Node) => {
		if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
			record(node.moduleSpecifier);
		}
		if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
			record(node.arguments[0]);
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return found;
};

const excepted = (from: WorkspacePackage, to: WorkspacePackage): boolean =>
	OLD_IMPORT_EXCEPTIONS.some((exception) => exception.from === from.name && exception.to === to.name);

const edgeViolations = (path: string, from: WorkspacePackage, packages: readonly WorkspacePackage[], specifier: Specifier): readonly Violation[] => {
	const [name, ...subpath] = specifier.text.slice(SCOPE.length).split("/");
	const to = packages.find((candidate) => candidate.name === `${SCOPE}${name}`);
	if (to === undefined || to.root === from.root) {
		return [];
	}
	const placement = placementOf(from.root);
	if (mayImport(placement, placementOf(to.root), subpath.length === 1 && subpath[0] === "contract") || excepted(from, to)) {
		return [];
	}
	const allowance = allowanceOf(placement);
	return [
		{
			file: path,
			line: specifier.line,
			message: `${from.name} may not import ${specifier.text}: ${allowance.group} packages import ${allowance.allowed}.`,
			rule: RULE,
		},
	];
};

export const layoutViolations = (inventory: Inventory): readonly Violation[] => {
	const packages = workspacePackages(inventory);
	return inventory.sources
		.filter((file) => !isDeclaration(file.path))
		.flatMap((file) => {
			const from = packageOf(packages, file.path);
			return from === undefined ? [] : specifiersOf(file).flatMap((specifier) => edgeViolations(file.path, from, packages, specifier));
		});
};
