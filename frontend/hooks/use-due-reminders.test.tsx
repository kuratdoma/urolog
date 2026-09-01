/**
 * useDueReminders davranış testi.
 *
 * Kritik sözleşme: aynı occurrence, sayfa 60 sn'de bir yeniden poll edilse
 * bile aynı oturumda İKİNCİ kez toast olarak gösterilmemeli — sessionStorage'da
 * "gösterildi" olarak işaretlenir. Bu sessizce bozulabilir (ör. state yerine
 * doğrudan query cache'e güvenilirse her refetch'te tekrar toast basar).
 */
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
    api: {
        personalNotes: {
            getDueReminders: vi.fn(),
        },
    },
}));

vi.mock("@/stores/auth-store", () => ({
    useAuthStore: (selector: (s: unknown) => unknown) =>
        selector({ token: "fake-token", _hasHydrated: true }),
}));

const toastMock = vi.fn();
vi.mock("sonner", () => ({
    toast: (...args: unknown[]) => toastMock(...args),
}));

import { api } from "@/lib/api";
import { useDueReminders } from "./use-due-reminders";

function makeWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, refetchInterval: false } },
    });
    function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }
    return Wrapper;
}

const occurrence = (id: number) => ({
    id,
    note_id: 1,
    scheduled_for: "2026-03-10T09:00:00Z",
    status: "fired" as const,
    note: {
        id: 1,
        user_id: 1,
        title: `Not ${id}`,
        content: "",
        color: "default" as const,
        recurrence_type: "once" as const,
        interval: 1,
        time_of_day: "09:00:00",
        starts_at: "2026-03-10T09:00:00Z",
        is_done: false,
        assignment_status: "none" as const,
        created_at: "2026-03-01T00:00:00Z",
    },
});

beforeEach(() => {
    sessionStorage.clear();
    toastMock.mockClear();
    vi.mocked(api.personalNotes.getDueReminders).mockReset();
});

describe("useDueReminders", () => {
    it("shows a toast for a newly due occurrence", async () => {
        vi.mocked(api.personalNotes.getDueReminders).mockResolvedValue({
            due: [occurrence(1)],
            missed_count: 0,
        });

        renderHook(() => useDueReminders(), { wrapper: makeWrapper() });

        await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
        expect(toastMock).toHaveBeenCalledWith("Not 1", expect.anything());
    });

    it("does not re-show a toast for an occurrence already marked shown this session", async () => {
        sessionStorage.setItem("urolog:shown-reminder-occurrences", JSON.stringify([1]));
        vi.mocked(api.personalNotes.getDueReminders).mockResolvedValue({
            due: [occurrence(1)],
            missed_count: 0,
        });

        renderHook(() => useDueReminders(), { wrapper: makeWrapper() });

        await new Promise((r) => setTimeout(r, 50));
        expect(toastMock).not.toHaveBeenCalled();
    });
});
