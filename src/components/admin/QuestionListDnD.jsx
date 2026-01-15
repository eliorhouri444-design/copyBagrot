import React, { useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { GripVertical, Edit2, Trash2 } from "lucide-react";

export default function QuestionListDnD({ questions = [], onReorder, onEdit, onDelete }) {
  const items = useMemo(() => questions.map((q, i) => ({ id: String(i), q })), [questions]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const start = result.source.index;
    const end = result.destination.index;
    if (start === end) return;

    const reordered = [...questions];
    const [moved] = reordered.splice(start, 1);
    reordered.splice(end, 0, moved);
    // Re-number question_number
    const renumbered = reordered.map((q, idx) => ({ ...q, question_number: idx + 1 }));
    onReorder(renumbered);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="questions-list">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
            {items.map((item, idx) => (
              <Draggable key={item.id} draggableId={item.id} index={idx}>
                {(prov) => (
                  <div ref={prov.innerRef} {...prov.draggableProps} className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200 flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div {...prov.dragHandleProps} className="mt-1 text-gray-400">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 mb-1">שאלה {idx + 1}</div>
                        <div className="text-sm text-gray-700 max-w-prose line-clamp-2">{item.q.question_text}</div>
                        {item.q.correct_answer && (
                          <div className="text-xs text-green-700 mt-1">תשובה: {item.q.correct_answer}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-blue-500 text-blue-600" onClick={() => onEdit(item.q, idx)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500 text-red-600" onClick={() => onDelete(idx)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}