import { useEffect } from 'react';

export function useKeyboardShortcuts({
    onSave,
    onSearch,
    onNew
}: {
    onSave?: () => void;
    onSearch?: () => void;
    onNew?: () => void;
}) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // CTRL+S or CMD+S -> SAVE
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
                if (onSave) {
                    e.preventDefault();
                    onSave();
                }
            }

            // CTRL+F or CMD+F -> SEARCH
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
                if (onSearch) {
                    e.preventDefault();
                    onSearch();
                }
            }

            // CTRL+B or CMD+B -> NEW (optional, asking 'New' usually implies blank/new form)
            // User didn't explicitly ask for this but it's good practice. 
            // However, sticking to requested S and F.
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onSave, onSearch]);
}
