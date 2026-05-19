import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"

interface PageInputProps {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    disabled?: boolean
}

export function PageInput({ currentPage, totalPages, onPageChange, disabled }: PageInputProps) {
    const [inputValue, setInputValue] = useState(String(currentPage))

    // Keep input in sync when currentPage changes from external navigation
    useEffect(() => {
        setInputValue(String(currentPage))
    }, [currentPage])

    const commit = () => {
        const num = parseInt(inputValue, 10)
        if (!isNaN(num) && num >= 1 && num <= totalPages) {
            onPageChange(num)
        } else {
            // Revert to current page if invalid
            setInputValue(String(currentPage))
        }
    }

    return (
        <Input
            type="number"
            min={1}
            max={totalPages}
            value={inputValue}
            disabled={disabled}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit() } }}
            className="h-7 w-14 text-center px-1 text-sm font-medium text-foreground"
        />
    )
}
