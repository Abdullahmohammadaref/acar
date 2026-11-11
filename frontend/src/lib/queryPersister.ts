import { get, set, del } from "idb-keyval"
import type { Persister, PersistedClient } from "@tanstack/react-query-persist-client"

/**
 * Creates an IndexedDB-backed persister for TanStack Query.
 * Stores the entire query cache on the local machine's disk so that
 * when DriveBase starts, queries resolve in <10ms directly from SSD
 * before silently revalidating in the background.
 */
export function createIDBPersister(idbKey = "drivebase-cache-v1"): Persister {
    return {
        persistClient: async (persistClient: PersistedClient) => {
            try {
                await set(idbKey, persistClient)
            } catch (error) {
                console.warn("[DriveBase Cache] Failed to write cache to IndexedDB:", error)
            }
        },
        restoreClient: async (): Promise<PersistedClient | undefined> => {
            try {
                return await get<PersistedClient>(idbKey)
            } catch (error) {
                console.warn("[DriveBase Cache] Failed to restore cache from IndexedDB:", error)
                return undefined
            }
        },
        removeClient: async () => {
            try {
                await del(idbKey)
            } catch (error) {
                console.warn("[DriveBase Cache] Failed to remove cache from IndexedDB:", error)
            }
        },
    }
}
