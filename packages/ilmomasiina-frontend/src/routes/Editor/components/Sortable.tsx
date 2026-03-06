import React, { ComponentType } from "react";

import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "react-bootstrap";

import useEvent from "../../../utils/useEvent";

type SortableItemProps = {
  id: string;
  name: string;
};

type SortableItemComponentProps = SortableItemProps & {
  index: number;
};

type SortableRowProps = SortableItemComponentProps & {
  component: ComponentType<SortableItemComponentProps>;
};

const SortableRow = ({ id, index, name, component: Component }: SortableRowProps) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  return (
    <Card
      ref={setNodeRef}
      // Set .ilmo--form to keep styling of form elements
      className={`sortable-item ${isDragging ? "sorting" : ""} ilmo--form`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <span ref={setActivatorNodeRef} className="handler" {...listeners} {...attributes} />
      <Component id={id} index={index} name={name} />
    </Card>
  );
};

type SortableProps = {
  items: SortableItemProps[];
  component: ComponentType<SortableItemComponentProps>;
  move: (oldIndex: number, newIndex: number) => void;
};

export default function Sortable({ items, component, move }: SortableProps) {
  const onDragEnd = useEvent((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      move(oldIndex, newIndex);
    }
  });

  return (
    <div>
      <DndContext onDragEnd={onDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {items.map((value, index) => (
            <SortableRow key={value.id} id={value.id} index={index} name={value.name} component={component} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
