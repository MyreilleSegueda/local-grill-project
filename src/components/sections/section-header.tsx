"use client";
import { PlusIcon } from "lucide-react";
import { Button } from "../ui/button";

type SectionHeaderProps = {
  title: string;
  description?: string;
};

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-medium">{title}</h1>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
  );
}

type SectionHeaderWithAddButtonProps = SectionHeaderProps & {
  onAdd: () => void;
  addLabel: string;
};

export function SectionHeaderWithAddButton({
  title,
  description,
  onAdd,
  addLabel = "Ajouter",
}: SectionHeaderWithAddButtonProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-medium">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      <Button variant="default" onClick={onAdd}>
        <PlusIcon />
        {addLabel}
      </Button>
    </div>
  );
}
