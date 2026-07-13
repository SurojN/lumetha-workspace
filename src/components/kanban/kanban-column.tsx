"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Task } from "@/types";
import { KanbanCard } from "./kanban-card";
import { cn } from "@/lib/utils/cn";

interface KanbanColumnProps {
  id: string;
  name: string;
  tasks: Task[];
  color?: string;
  onTaskClick?: (task: Task) => void;
}

export function KanbanColumn({
  id,
  name,
  tasks,
  color,
  onTaskClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg p-4 min-h-96 flex flex-col gap-3",
        "bg-slate-50 dark:bg-slate-900",
        isOver && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950",
      )}
    >
      <div className="flex items-center gap-2">
        {color && (
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        <h3 className="font-semibold text-sm">{name}</h3>
        <span className="ml-auto text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
          {tasks.length}
        </span>
      </div>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-3 flex-1">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <KanbanCard key={task.id} task={task} onClick={onTaskClick} />
            ))
          ) : (
            <div className="flex items-center justify-center flex-1 text-slate-400 text-sm">
              No tasks
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
