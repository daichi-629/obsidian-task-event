import type { TaskChange } from "./diff";

export function formatStatusChange(change: TaskChange): string {
	const location = buildLocationLabel(change);
	return `Task status changed: ${change.description} [${change.fromStatus} -> ${change.toStatus}]${location}`;
}

function buildLocationLabel(change: TaskChange): string {
	if (!change.path) {
		return "";
	}

	const lineNumber = change.lineNumber ?? 0;
	return lineNumber > 0 ? ` (${change.path}:${lineNumber})` : ` (${change.path})`;
}
