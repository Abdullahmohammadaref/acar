import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface SortMenuOption {
    value: string
    label: string
}

interface SortMenuButtonProps {
    options: SortMenuOption[]
    sort: string
    order: "asc" | "desc"
    onSortChange: (value: string) => void
    onOrderChange: (value: "asc" | "desc") => void
}

export function SortMenuButton({
    options,
    sort,
    order,
    onSortChange,
    onOrderChange,
}: SortMenuButtonProps) {
    const activeOption = options.find((option) => option.value === sort)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Sort
                    {activeOption && (
                        <span className="hidden text-muted-foreground lg:inline">
                            {activeOption.label}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={sort} onValueChange={onSortChange}>
                    {options.map((option) => (
                        <DropdownMenuRadioItem key={option.value} value={option.value}>
                            {option.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />

                <DropdownMenuLabel>Order</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                    value={order}
                    onValueChange={(value) => onOrderChange(value as "asc" | "desc")}
                >
                    <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
