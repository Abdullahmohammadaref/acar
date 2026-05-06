import { useCallback, useEffect, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error"

// Type for query keys - accepts both mutable and readonly arrays
type QueryKey = readonly unknown[] | unknown[]

interface UseAutoSaveOptions {
    /** API endpoint to update (e.g., "/vehicles/123") */
    endpoint: string
    /** HTTP method to use (default: 'PATCH') */
    method?: 'PATCH' | 'PUT'
    /** Debounce delay in milliseconds for text inputs (default: 800ms) */
    debounceMs?: number
    /** 
     * Query keys to invalidate on successful save.
     * This ensures React Query cache is updated and navigation shows fresh data.
     * Example: [['transaction', 74], ['transactions']]
     */
    invalidateQueryKeys?: QueryKey[]
    /** 
     * Query key for direct cache update with response data.
     * This provides instant updates without waiting for refetch.
     * Example: ['transaction', 74]
     */
    updateQueryKey?: QueryKey
    /** Callback on successful save */
    onSuccess?: () => void
    /** Callback on error */
    onError?: (error: unknown) => void
}

interface AutoSaveResult<T> {
    /** Current save status */
    status: AutoSaveStatus
    /** Error message if status is "error" */
    errorMessage: string | null
    /** Trigger an immediate save (for dropdowns) */
    saveNow: (data: Partial<T>) => void
    /** Trigger a debounced save (for text inputs) */
    saveDebounced: (data: Partial<T>) => void
    /** Reset status to idle */
    resetStatus: () => void
}

/**
 * Hook for auto-saving form data with debounce support.
 * 
 * Usage:
 * - For dropdowns/selects: use `saveNow()` for immediate save
 * - For text inputs: use `saveDebounced()` to batch keystrokes
 * 
 * Cache Management:
 * - Use `invalidateQueryKeys` to invalidate related queries on save
 * - Use `updateQueryKey` to directly update the cache for instant feedback
 * 
 * @example
 * const { status, saveNow, saveDebounced } = useAutoSave<VehicleUpdateData>({
 *   endpoint: `/vehicles/${vehicle.internal_id}`,
 *   method: 'PATCH',
 *   // Invalidate both the detail view and list view caches
 *   invalidateQueryKeys: [['vehicle', vehicle.internal_id], ['vehicles']],
 *   // Direct cache update for instant feedback
 *   updateQueryKey: ['vehicle', vehicle.internal_id],
 * })
 * 
 * // Dropdown change - immediate save
 * onChange={(val) => {
 *   setValue("color_id", val)
 *   saveNow({ color_id: val })
 * }}
 * 
 * // Text input change - debounced save
 * onChange={(e) => {
 *   setValue("description", e.target.value)
 *   saveDebounced({ description: e.target.value })
 * }}
 */
export function useAutoSave<T>({
    endpoint,
    method = 'PATCH',
    debounceMs = 800,
    invalidateQueryKeys = [],
    updateQueryKey,
    onSuccess,
    onError,
}: UseAutoSaveOptions): AutoSaveResult<T> {
    const [status, setStatus] = useState<AutoSaveStatus>("idle")
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Get query client for cache management
    const queryClient = useQueryClient()

    // Refs for debouncing
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
    const pendingDataRef = useRef<Partial<T> | null>(null)

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
            }
        }
    }, [])

    // Mutation for saving with cache invalidation
    const saveMutation = useMutation({
        mutationFn: async (data: Partial<T>) => {
            console.log('[useAutoSave] ========== SAVE REQUEST ==========')
            console.log('[useAutoSave] Endpoint:', endpoint)
            console.log('[useAutoSave] Method:', method)
            console.log('[useAutoSave] Payload:', JSON.stringify(data, null, 2))

            const response = method === 'PUT'
                ? await api.put(endpoint, data)
                : await api.patch(endpoint, data)

            console.log('[useAutoSave] Response Status:', response.status)
            console.log('[useAutoSave] Response Data:', JSON.stringify(response.data, null, 2))
            return response.data
        },
        onMutate: () => {
            setStatus("saving")
            setErrorMessage(null)
        },
        onSuccess: (responseData) => {
            console.log('[useAutoSave] SUCCESS! Data saved.')
            setStatus("saved")

            // Update cache directly with response data for instant feedback
            if (updateQueryKey) {
                console.log('[useAutoSave] Updating query cache:', updateQueryKey)
                queryClient.setQueryData(updateQueryKey, responseData)
            }

            // Invalidate related queries to ensure fresh data on navigation
            // This is done AFTER setQueryData so the immediate update is not overwritten
            if (invalidateQueryKeys.length > 0) {
                console.log('[useAutoSave] Invalidating queries:', invalidateQueryKeys)
                invalidateQueryKeys.forEach((queryKey) => {
                    queryClient.invalidateQueries({ queryKey })
                })
            }

            onSuccess?.()

            // Reset to idle after showing "Saved" briefly
            setTimeout(() => {
                setStatus((current) => (current === "saved" ? "idle" : current))
            }, 2000)
        },
        onError: (error: unknown) => {
            console.error('[useAutoSave] ERROR!', error)
            setStatus("error")
            const axiosError = error as { response?: { data?: { message?: string }, status?: number } }
            console.error('[useAutoSave] Error Status:', axiosError?.response?.status)
            console.error('[useAutoSave] Error Data:', axiosError?.response?.data)
            setErrorMessage(axiosError?.response?.data?.message || "Failed to save")
            onError?.(error)
        },
    })

    // Immediate save (for dropdowns)
    const saveNow = useCallback((data: Partial<T>) => {
        // Clear any pending debounced save
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
            debounceTimerRef.current = null
        }
        pendingDataRef.current = null

        saveMutation.mutate(data)
    }, [saveMutation])

    // Debounced save (for text inputs)
    const saveDebounced = useCallback((data: Partial<T>) => {
        // Merge with pending data
        pendingDataRef.current = {
            ...pendingDataRef.current,
            ...data,
        }

        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }

        // Set new timer
        debounceTimerRef.current = setTimeout(() => {
            if (pendingDataRef.current) {
                saveMutation.mutate(pendingDataRef.current)
                pendingDataRef.current = null
            }
        }, debounceMs)
    }, [debounceMs, saveMutation])

    const resetStatus = useCallback(() => {
        setStatus("idle")
        setErrorMessage(null)
    }, [])

    return {
        status,
        errorMessage,
        saveNow,
        saveDebounced,
        resetStatus,
    }
}

