import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/src/components/ui/input-group";
import { SearchIcon } from "lucide-react";

type SearchProps = {
  onSearch: (query: string) => void;
  placeholder?: string;
};
const Search = ({ onSearch, placeholder }: SearchProps) => {
  return (
    <InputGroup>
      <InputGroupInput
        onChange={(e) => onSearch(e.target.value)}
        placeholder={placeholder}
      />
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
    </InputGroup>
  );
};

export default Search;
