import * as React from "react"

import { cn } from "@/lib/utils"
import { useSettingsStore } from "@/stores/settings-store"
import { handleTextFormattingKeyDown } from "@/lib/text-formatting-shortcut"

interface InputProps extends React.ComponentProps<"input"> {
  disableAutoCapitalize?: boolean;
}

function Input({ className, type, disableAutoCapitalize, onChange, onKeyDown, ...props }: InputProps) {
  const autoCapitalize = useSettingsStore((state) => state.autoCapitalize);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Apply auto-capitalize for text inputs if enabled and not explicitly disabled
    const shouldCapitalize =
      autoCapitalize &&
      !disableAutoCapitalize &&
      (!type || type === 'text') &&
      e.target.value;

    if (shouldCapitalize) {
      e.target.value = e.target.value.toLocaleUpperCase('tr-TR');
    }

    onChange?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleTextFormattingKeyDown(e);
    onKeyDown?.(e);
  };

  return (
    <input
      type={type}
      data-slot="input"
      spellCheck="true"
      autoCorrect="on"
      autoComplete="on"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      {...props}
    />
  )
}

export { Input }
