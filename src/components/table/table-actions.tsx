import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { EllipsisVerticalIcon, Pencil, Trash } from "lucide-react";

export function RowActions({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex">
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full p-2"
            aria-label="Edit item"
          >
            <EllipsisVerticalIcon className="size-5" aria-hidden="true" />
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>{children}</DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type TableActionProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  children?: React.ReactNode;
};

export const TableAction = ({
  onEdit,
  onDelete,
  children,
}: TableActionProps) => {
  return (
    <RowActions>
      <DropdownMenuItem onClick={onEdit}>
        <Pencil className="h-4 w-4" />
        Modifier
      </DropdownMenuItem>
      {/* Additional actions */}
      {children}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={onDelete} variant="destructive">
        <Trash />
        Supprimer
      </DropdownMenuItem>
    </RowActions>
  );
};
