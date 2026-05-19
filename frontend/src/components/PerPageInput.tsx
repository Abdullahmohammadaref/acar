import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"

interface PerPageInputProps {
    value: number
    onChange: (value: number) => void
    label?: string
}

export function PerPageInput({ value, onChange, label = "per page" }: PerPageInputProps) {
    const [inputValue, setInputValue] = useState(String(value))

    // Keep input in sync when value changes from external sources
    useEffect(() => {
        setInputValue(String(value))
    }, [value])

    const commit = () => {
        const num = parseInt(inputValue, 10)
        // Check if the number is valid and within range
        if (!isNaN(num) && num >= 1 && num <= 500) {
            onChange(num)
        } else {
            // If empty, NaN, or invalid range, default to 20 as requested
            const defaultValue = 20
            setInputValue(String(defaultValue))
            onChange(defaultValue)
        }
    }

    return (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault()
                        commit()
                    }
                }}
                className="h-7 w-14 text-center px-1 text-sm font-medium text-foreground"
            />
            <span>{label}</span>
        </div>
    )
}
