import { useId } from "react";
import { Input, type InputProps } from "@/components/ui/input";

/** A text box that suggests earlier values as the person types, but accepts anything new. */
export function SuggestInput({ options, ...props }: InputProps & { options: string[] }) {
  const listId = useId();
  return (
    <>
      <Input list={listId} autoComplete="off" {...props} />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );
}
