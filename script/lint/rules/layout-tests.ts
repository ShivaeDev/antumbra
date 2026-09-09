import ts from "typescript";
import { type Inventory, isDeclaration, type SourceFile } from "#lint/inventory.ts";
import { placementOf } from "#lint/rules/layout-groups.ts";
import { specifiersOf } from "#lint/rules/layout-specifiers.ts";
import type { Violation } from "#lint/violation.ts";
import { packageOf, type WorkspacePackage, workspacePackages } from "#lint/workspace.ts";

const RULE = "layout/tests-own-their-processes";
const OWNERSHIP = "a test owns only the children it spawned";
const ALLOWANCE = "only a package under apps/ runs children";

const PROCESS = "process";
const COMMANDS = ["ps", "pkill", "killall"];
const SPAWNING = ["node:child_process", "child_process"];
const SPAWNERS = ["NodeChildProcessSpawner", "NodeServices"];

const OWNERS: readonly { readonly root: string; readonly specifier: string }[] = [
	{ root: "packages/platform/service-definition", specifier: "node:child_process" },
];

interface Reach {
	readonly line: number;
	readonly text: string;
}

const names = (specifier: string, module: string): boolean => specifier === module || specifier.startsWith(`${module}/`);

const sourceOf = (file: SourceFile): ts.SourceFile =>
	ts.createSourceFile(
		file.path,
		file.lines.join("\n"),
		ts.ScriptTarget.Latest,
		true,
		file.path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);

const nodesOf = (source: ts.SourceFile): readonly ts.Node[] => {
	const found: ts.Node[] = [];
	const visit = (node: ts.Node) => {
		found.push(node);
		ts.forEachChild(node, visit);
	};
	visit(source);
	return found;
};

const lineOf = (source: ts.SourceFile, node: ts.Node): number => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;

const declaredName = (node: ts.Node): ts.Node | undefined => {
	if (ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isBindingElement(node)) return node.name;
	if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) return node.name;
	if (ts.isImportClause(node) || ts.isImportSpecifier(node) || ts.isNamespaceImport(node)) return node.name;
	return undefined;
};

const bindsProcess = (nodes: readonly ts.Node[]): boolean =>
	nodes.some((node) => {
		const name = declaredName(node);
		return name !== undefined && ts.isIdentifier(name) && name.text === PROCESS;
	});

const killsGlobalProcess = (node: ts.Node): boolean =>
	ts.isCallExpression(node) &&
	ts.isPropertyAccessExpression(node.expression) &&
	node.expression.name.text === "kill" &&
	ts.isIdentifier(node.expression.expression) &&
	node.expression.expression.text === PROCESS;

const scansProcesses = (node: ts.Node): boolean => {
	if (!ts.isStringLiteralLike(node)) return false;
	const { text } = node;
	return COMMANDS.some((command) => text === command || text.startsWith(`${command} `));
};

const pidViolations = (file: SourceFile, source: ts.SourceFile, nodes: readonly ts.Node[]): readonly Violation[] => {
	const handle = bindsProcess(nodes);
	return nodes
		.filter((node) => scansProcesses(node) || (!handle && killsGlobalProcess(node)))
		.map((node) => ({
			file: file.path,
			line: lineOf(source, node),
			message: `${file.path} kills or scans processes by pid: ${OWNERSHIP}.`,
			rule: RULE,
		}));
};

const spawning = (owner: WorkspacePackage, specifier: string): boolean =>
	SPAWNING.some((module) => names(specifier, module)) && !OWNERS.some((owns) => owns.root === owner.root && names(specifier, owns.specifier));

const spawnViolations = (file: SourceFile, owner: WorkspacePackage, source: ts.SourceFile, nodes: readonly ts.Node[]): readonly Violation[] => {
	const reaches: readonly Reach[] = [
		...specifiersOf(file)
			.filter((specifier) => spawning(owner, specifier.text))
			.map((specifier) => ({ line: specifier.line, text: specifier.text })),
		...nodes.flatMap((node) => (ts.isIdentifier(node) && SPAWNERS.includes(node.text) ? [{ line: lineOf(source, node), text: node.text }] : [])),
	];
	return reaches.map((reach) => ({
		file: file.path,
		line: reach.line,
		message: `${owner.name} tests may not spawn: ${reach.text}; ${ALLOWANCE}.`,
		rule: RULE,
	}));
};

const isTest = (owner: WorkspacePackage | undefined, path: string): boolean =>
	path.endsWith(".test.ts") ||
	path.endsWith(".test.tsx") ||
	path.startsWith("script/test/") ||
	(owner !== undefined && path.startsWith(`${owner.root}/test/`));

const nested = (owner: WorkspacePackage): boolean => {
	const { group } = placementOf(owner.root);
	return group !== "app" && group !== "old";
};

export const layoutTestsViolations = (inventory: Inventory): readonly Violation[] => {
	const packages = workspacePackages(inventory);
	return inventory.sources
		.filter((file) => !isDeclaration(file.path))
		.flatMap((file) => {
			const owner = packageOf(packages, file.path);
			if (!isTest(owner, file.path)) return [];
			const source = sourceOf(file);
			const nodes = nodesOf(source);
			const spawns = owner !== undefined && nested(owner) ? spawnViolations(file, owner, source, nodes) : [];
			return [...pidViolations(file, source, nodes), ...spawns];
		});
};
