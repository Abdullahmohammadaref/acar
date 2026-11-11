import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth"
import api from "@/lib/api"
import { vehicleKeys } from "@/hooks/useVehicles"

/**
 * Background warmup hook to eagerly prefetch core reference data
 * (Choices, Choices Management, Legal Entities) into client memory.
 * Runs non-blocking after a short delay so the initial screen renders first.
 */
export function useAppWarmup() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    useEffect(() => {
        if (!user) return

        const timer = setTimeout(() => {
            // 1. Eagerly prefetch global dropdown choices
            void queryClient.prefetchQuery({
                queryKey: vehicleKeys.choices(),
                queryFn: async () => {
                    const res = await api.get("/choices")
                    return res.data
                },
                staleTime: 1000 * 60 * 60, // 1 hour
            })

            // 2. Eagerly prefetch full Choices Management dataset
            void queryClient.prefetchQuery({
                queryKey: ["choices-management"],
                queryFn: async () => {
                    const res = await api.get("/choices/management")
                    return res.data
                },
                staleTime: 1000 * 60 * 30, // 30 minutes
            })

            // 3. Eagerly prefetch default legal entities
            void queryClient.prefetchQuery({
                queryKey: ["legal-entities", {}],
                queryFn: async () => {
                    const res = await api.get("/legal-entities")
                    return res.data
                },
                staleTime: 1000 * 60 * 15, // 15 minutes
            })
        }, 300)

        return () => clearTimeout(timer)
    }, [user, queryClient])
}
