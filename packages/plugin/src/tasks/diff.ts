import type { TaskItem, TasksPluginCacheUpdatePayload } from "./types";

export type TaskChange = {
	key: string;
	description: string;
	fromStatus: string;
	toStatus: string;
	path?: string;
	lineNumber?: number;
};

type TaskSnapshot = {
	statusSignature: string;
	task: TaskItem;
};

export function diffTasks(
	previous: TasksPluginCacheUpdatePayload | null,
	current: TasksPluginCacheUpdatePayload
): TaskChange[] {
	if (!previous) {
		return [];
	}

	const previousSnapshot = buildSnapshot(previous.tasks);
	const currentSnapshot = buildSnapshot(current.tasks);
	const changes: TaskChange[] = [];

	for (const [key, currentItem] of currentSnapshot) {
		const previousItem = previousSnapshot.get(key);
		if (!previousItem) {
			continue;
		}

		if (previousItem.statusSignature !== currentItem.statusSignature) {
			changes.push(buildTaskChange(key, previousItem.task, currentItem.task));
		}
	}

	return changes;
}

function buildSnapshot(tasks: TaskItem[]): Map<string, TaskSnapshot> {
	const snapshot = new Map<string, TaskSnapshot>();
	for (const task of tasks) {
		const key = getTaskKey(task);
		snapshot.set(key, {
			statusSignature: getStatusSignature(task),
			task
		});
	}

	return snapshot;
}

function buildTaskChange(key: string, fromTask: TaskItem, toTask: TaskItem): TaskChange {
	const { path, lineNumber } = getLocation(toTask);
	return {
		key,
		description: toTask.description ?? "(no description)",
		fromStatus: getStatusLabel(fromTask),
		toStatus: getStatusLabel(toTask),
		path,
		lineNumber
	};
}

function getTaskKey(task: TaskItem): string {
	if (task.id && task.id.trim().length > 0) {
		return task.id;
	}

	const path = task.taskLocation?._tasksFile?._path ?? "unknown-path";
	const lineNumber = task.taskLocation?._lineNumber ?? -1;
	const description = task.description ?? "";
	return `${path}::${lineNumber}::${description}`;
}

function getStatusSignature(task: TaskItem): string {
	const symbol = task.status?.configuration?.symbol ?? "";
	const type = task.status?.configuration?.type ?? "";
	const name = task.status?.configuration?.name ?? "";
	return `${symbol}|${type}|${name}`;
}

function getStatusLabel(task: TaskItem): string {
	return (
		task.status?.configuration?.symbol ||
		task.status?.configuration?.type ||
		task.status?.configuration?.name ||
		"unknown"
	);
}

function getLocation(task: TaskItem): { path?: string; lineNumber?: number } {
	const path = task.taskLocation?._tasksFile?._path;
	const lineNumber = task.taskLocation?._lineNumber;
	return { path, lineNumber };
}
