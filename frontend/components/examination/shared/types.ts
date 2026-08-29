import { z } from 'zod';

/**
 * Standard Operation Interface for Controlled Components
 * @template T - The Zod Schema Type or Data Interface
 */
export interface Ops<T> {
    /**
     * The current value of the form/component
     */
    value: T;

    /**
     * Callback when value changes.
     * Guaranteed to emit full valid object or partial updates depending on implementation contract.
     */
    onChange: (value: T) => void;

    /**
     * If true, the component enters Read-Only mode.
     * - No interactivity
     * - No events emitted
     * - Visual 'disabled' or 'static' state
     */
    readOnly?: boolean;

    /**
     * If true, displays loading state/skeleton
     */
    isLoading?: boolean;

    /**
     * Error message to display, if any
     */
    error?: string | null;
}

/**
 * Base status for Finite State Machines
 */
export type FormStatus = 'idle' | 'validating' | 'saving' | 'saved' | 'error';
