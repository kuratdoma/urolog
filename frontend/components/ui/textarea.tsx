import * as React from "react"

import { cn } from "@/lib/utils"
import { useSettingsStore } from "@/stores/settings-store"
import { handleTextFormattingKeyDown } from "@/lib/text-formatting-shortcut"

interface TextareaProps extends React.ComponentProps<"textarea"> {
  disableAutoCapitalize?: boolean;
}

function Textarea({ className, disableAutoCapitalize, onChange, onKeyDown, ...props }: TextareaProps) {
  const autoCapitalize = useSettingsStore((state) => state.autoCapitalize);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Apply auto-capitalize if enabled and not explicitly disabled
    const shouldCapitalize = autoCapitalize && !disableAutoCapitalize && e.target.value;

    if (shouldCapitalize) {
      e.target.value = e.target.value.toLocaleUpperCase('tr-TR');
    }

    onChange?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    handleTextFormattingKeyDown(e);
    onKeyDown?.(e);
  };

  return (
    <textarea
      data-slot="textarea"
      spellCheck="true"
      autoCorrect="on"
      autoComplete="on"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      {...props}
    />
  )
}

export { Textarea }
