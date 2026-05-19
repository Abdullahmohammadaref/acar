import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface StringChoice {
    value: string
    label: string
}

interface SearchableSelectProps {
    /** Available options */
    options: StringChoice[]
    /** Currently selected value */
    value: string | undefined
    /** Callback when value changes */
    onChange: (value: string) => void
    /** Placeholder text */
    placeholder?: string
    /** Whether the field is disabled */
    disabled?: boolean
    /** Search placeholder text */
    searchPlaceholder?: string
}

/**
 * SearchableSelect - A searchable dropdown for string-based choices
 * Similar to DynamicSelect but works with { value: string, label: string } format
 * Does not include Quick Add functionality (for that, use DynamicSelect with ID-based choices)
 */
export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Select...",
    disabled = false,
    searchPlaceholder = "Search...",
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    // Find selected option
    const selectedOption = options.find((opt) => opt.value === value)

    // Filter options based on search
    const filteredOptions = searchQuery
        ? options.filter((opt) =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : options

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between text-foreground"
                    disabled={disabled}
                >
                    <span className="truncate text-left font-normal">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <div className="p-2 border-b border-border">
                    <Input
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 text-foreground placeholder:text-muted-foreground"
                    />
                </div>
                <div className="max-h-[300px] overflow-y-auto overflow-x-hidden">
                    <div className="p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
                                No results found
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        onChange(option.value)
                                        setOpen(false)
                                        setSearchQuery("")
                                    }}
                                    className={cn(
                                        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground hover:bg-accent",
                                        value === option.value && "bg-accent"
                                    )}
                                >
                                    <Check
                                        className={cn(
                                            "h-4 w-4",
                                            value === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
