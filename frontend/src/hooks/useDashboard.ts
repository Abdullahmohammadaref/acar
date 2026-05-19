/**
 * useDashboard — Fetches aggregated dashboard data from /api/dashboard/
 *
 * Single endpoint, single request, all KPIs pre-computed server-side.
 * No client-side aggregation needed.
 */
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import type { DashboardData } from "@/types/dashboard"

export const dashboardKeys = {
    all: ["dashboard"] as const,
    data: () => [...dashboardKeys.all, "data"] as const,
}

export function useDashboard() {
    return useQuery({
        queryKey: dashboardKeys.data(),
        queryFn: async (): Promise<DashboardData> => {
            const response = await api.get<DashboardData>("/dashboard/")
            return response.data
        },
        staleTime: 1000 * 60 * 2, // 2 minutes
        retry: 2,
    })
}
