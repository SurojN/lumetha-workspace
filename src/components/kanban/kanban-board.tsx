"use client";

import React, { useCallback, useState } from "react";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Task } from "@/types";
import { KanbanColumn } from "./kanban-column";

export interface KanbanColumn {
  id: string;
  name: string;
  color?: string;
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  tasks: Task[];
  onTaskMove?: (
    taskId: string,
    columnId: string,
    order: number,
  ) => Promise<void>;
  onTaskClick?: (task: Task) => void;
}

export function KanbanBoard({
  columns,
  tasks,
  onTaskMove,
  onTaskClick,
}: KanbanBoardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const task = tasks.find((t) => t.id === active.id);
      if (!task) return;

      const newColumnId = over.id as string;
      if (onTaskMove && !isLoading) {
        setIsLoading(true);
        try {
          await onTaskMove(task.id, newColumnId, 0);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [tasks, onTaskMove, isLoading],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column.id} className="flex-shrink-0 w-96">
            <KanbanColumn
              id={column.id}
              name={column.name}
              color={column.color}
              tasks={tasks.filter((t) => t.boardColumnId === column.id)}
              onTaskClick={onTaskClick}
            />
          </div>
        ))}
      </div>
    </DndContext>
  );
}
