"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/types";
import { Card } from "../ui/card";
import { cn } from "@/lib/utils/cn";
import { formatTimeAgo } from "@/lib/utils/date";

interface KanbanCardProps {
  task: Task;
  onClick?: (task: Task) => void;
}

export function KanbanCard({ task, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColor = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };

  const typeIcon = {
    task: "✓",
    bug: "🐛",
    feature: "⭐",
    improvement: "📈",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className={cn(
          "p-3 cursor-move hover:shadow-md transition-shadow",
          isDragging && "ring-2 ring-blue-500",
        )}
        onClick={() => onClick?.(task)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500">
                {task.key}
              </span>
              <span className="text-xs">
                {typeIcon[task.type as keyof typeof typeIcon]}
              </span>
            </div>
            <p className="text-sm font-medium leading-tight mt-1 line-clamp-2">
              {task.title}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 gap-2">
          <span
            className={cn(
              "text-xs px-2 py-1 rounded font-medium",
              priorityColor[task.priority as keyof typeof priorityColor],
            )}
          >
            {task.priority}
          </span>
          {task.assigneeId && (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
              A
            </div>
          )}
        </div>

        {task.dueDate && (
          <div className="text-xs text-slate-500 mt-2">
            Due {formatTimeAgo(task.dueDate)}
          </div>
        )}
      </Card>
    </div>
  );
}
