import React from 'react';

/**
 * Checks if the target element is an editable text element (<textarea> or text-based <input>).
 */
export function isTextInputElement(target: HTMLElement): target is HTMLInputElement | HTMLTextAreaElement {
  if (target.tagName === 'TEXTAREA') return true;
  if (target.tagName === 'INPUT') {
    const input = target as HTMLInputElement;
    const type = (input.type || 'text').toLowerCase();
    const textTypes = ['text', 'search', 'url', 'tel', 'password', 'email'];
    return textTypes.includes(type);
  }
  return false;
}

/**
 * Formats selected text or inserts formatting tags for Bold (Ctrl/Cmd+B) and Italic (Ctrl/Cmd+I).
 * Returns true if shortcut was executed, false otherwise.
 */
export function handleTextFormattingKeyDown(
  e: React.KeyboardEvent<HTMLElement> | KeyboardEvent,
  targetElement?: HTMLInputElement | HTMLTextAreaElement
): boolean {
  // Check if Ctrl (Windows/Linux) or Cmd/Meta (Mac) is pressed
  if (!e.ctrlKey && !e.metaKey) return false;
  if (e.altKey || e.shiftKey) return false;

  const key = e.key.toLowerCase();
  if (key !== 'b' && key !== 'i') return false;

  const target = (targetElement || e.target) as (HTMLInputElement | HTMLTextAreaElement | null);
  if (!target || !isTextInputElement(target)) return false;
  if (target.disabled || target.readOnly) return false;

  // Prevent default browser shortcuts (e.g. Ctrl+B bookmark, Ctrl+I page info)
  e.preventDefault();

  const start = target.selectionStart ?? 0;
  const end = target.selectionEnd ?? 0;
  const value = target.value || '';
  const isBold = key === 'b';

  let newValue = value;
  let newStart = start;
  let newEnd = end;

  if (isBold) {
    // BOLD FORMATTING LOGIC
    if (start < end) {
      const selected = value.substring(start, end);
      // Case 1: Selected text itself is wrapped in **...**
      if (selected.startsWith('**') && selected.endsWith('**') && selected.length >= 4) {
        const unwrapped = selected.slice(2, -2);
        newValue = value.substring(0, start) + unwrapped + value.substring(end);
        newStart = start;
        newEnd = start + unwrapped.length;
      }
      // Case 2: Selected text itself is wrapped in <b>...</b>
      else if (selected.toLowerCase().startsWith('<b>') && selected.toLowerCase().endsWith('</b>') && selected.length >= 7) {
        const unwrapped = selected.slice(3, -4);
        newValue = value.substring(0, start) + unwrapped + value.substring(end);
        newStart = start;
        newEnd = start + unwrapped.length;
      }
      // Case 3: Outer surrounding characters are **...**
      else if (
        start >= 2 &&
        end + 2 <= value.length &&
        value.substring(start - 2, start) === '**' &&
        value.substring(end, end + 2) === '**'
      ) {
        newValue = value.substring(0, start - 2) + selected + value.substring(end + 2);
        newStart = start - 2;
        newEnd = end - 2;
      }
      // Case 4: Outer surrounding characters are <b>...</b>
      else if (
        start >= 3 &&
        end + 4 <= value.length &&
        value.substring(start - 3, start).toLowerCase() === '<b>' &&
        value.substring(end, end + 4).toLowerCase() === '</b>'
      ) {
        newValue = value.substring(0, start - 3) + selected + value.substring(end + 4);
        newStart = start - 3;
        newEnd = end - 3;
      }
      // Case 5: Not bolded yet -> Wrap with **...**
      else {
        const wrapped = '**' + selected + '**';
        newValue = value.substring(0, start) + wrapped + value.substring(end);
        newStart = start;
        newEnd = start + wrapped.length;
      }
    } else {
      // Cursor position (no text selected)
      if (start >= 2 && end + 2 <= value.length && value.substring(start - 2, start + 2) === '****') {
        // Remove empty ****
        newValue = value.substring(0, start - 2) + value.substring(start + 2);
        newStart = start - 2;
        newEnd = start - 2;
      } else {
        // Insert **** and place cursor in middle
        newValue = value.substring(0, start) + '****' + value.substring(end);
        newStart = start + 2;
        newEnd = start + 2;
      }
    }
  } else {
    // ITALIC FORMATTING LOGIC
    if (start < end) {
      const selected = value.substring(start, end);
      // Case 1: Selected text itself is wrapped in *...* (and not **)
      if (
        selected.startsWith('*') &&
        selected.endsWith('*') &&
        !selected.startsWith('**') &&
        !selected.endsWith('**') &&
        selected.length >= 2
      ) {
        const unwrapped = selected.slice(1, -1);
        newValue = value.substring(0, start) + unwrapped + value.substring(end);
        newStart = start;
        newEnd = start + unwrapped.length;
      }
      // Case 2: Selected text itself is wrapped in <i>...</i>
      else if (selected.toLowerCase().startsWith('<i>') && selected.toLowerCase().endsWith('</i>') && selected.length >= 7) {
        const unwrapped = selected.slice(3, -4);
        newValue = value.substring(0, start) + unwrapped + value.substring(end);
        newStart = start;
        newEnd = start + unwrapped.length;
      }
      // Case 3: Outer surrounding characters are *...*
      else if (
        start >= 1 &&
        end + 1 <= value.length &&
        value.substring(start - 1, start) === '*' &&
        value.substring(end, end + 1) === '*' &&
        value.substring(start - 2, start) !== '**' &&
        value.substring(end, end + 2) !== '**'
      ) {
        newValue = value.substring(0, start - 1) + selected + value.substring(end + 1);
        newStart = start - 1;
        newEnd = end - 1;
      }
      // Case 4: Outer surrounding characters are <i>...</i>
      else if (
        start >= 3 &&
        end + 4 <= value.length &&
        value.substring(start - 3, start).toLowerCase() === '<i>' &&
        value.substring(end, end + 4).toLowerCase() === '</i>'
      ) {
        newValue = value.substring(0, start - 3) + selected + value.substring(end + 4);
        newStart = start - 3;
        newEnd = end - 3;
      }
      // Case 5: Not italicized yet -> Wrap with *...*
      else {
        const wrapped = '*' + selected + '*';
        newValue = value.substring(0, start) + wrapped + value.substring(end);
        newStart = start;
        newEnd = start + wrapped.length;
      }
    } else {
      // Cursor position (no text selected)
      if (start >= 1 && end + 1 <= value.length && value.substring(start - 1, start + 1) === '**' && value.substring(start - 2, start + 2) !== '****') {
        // Remove empty **
        newValue = value.substring(0, start - 1) + value.substring(start + 1);
        newStart = start - 1;
        newEnd = start - 1;
      } else {
        // Insert ** and place cursor in middle
        newValue = value.substring(0, start) + '**' + value.substring(end);
        newStart = start + 1;
        newEnd = start + 1;
      }
    }
  }

  // Set element value using prototype descriptor to trigger React internal value tracker
  const prototype = target.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;

  const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (valueSetter) {
    valueSetter.call(target, newValue);
  } else {
    target.value = newValue;
  }

  // Dispatch native input event so React state listener updates
  target.dispatchEvent(new Event('input', { bubbles: true }));

  // Restore selection range asynchronously
  requestAnimationFrame(() => {
    try {
      target.setSelectionRange(newStart, newEnd);
    } catch {
      // Selection range not supported on some input types
    }
  });

  return true;
}

/**
 * Initializes global event listener for text formatting shortcuts across all text inputs & textareas in the window.
 */
export function initGlobalTextFormattingShortcuts(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return;
    const target = e.target as HTMLElement | null;
    if (target && isTextInputElement(target)) {
      handleTextFormattingKeyDown(e, target);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}
