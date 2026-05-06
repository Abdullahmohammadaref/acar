import { useEffect, useMemo, useRef, useState } from "react"
import { Image as ImageIcon, Loader2, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn, withMediaCacheKey } from "@/lib/utils"

interface VehicleImageUploadProps {
    imageUrl?: string | null
    selectedFile?: File | null
    onFileChange: (file: File | null) => void | Promise<void>
    isUploading?: boolean
    errorMessage?: string | null
    disabled?: boolean
    className?: string
    label?: string
}

const ACCEPTED_IMAGE_EXTENSIONS = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".bmp",
    ".tif",
    ".tiff",
    ".avif",
]

const ACCEPTED_IMAGE_INPUT = `image/*,${ACCEPTED_IMAGE_EXTENSIONS.join(",")}`
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

function isAcceptedImageFile(file: File) {
    const lowercaseName = file.name.toLowerCase()
    return file.type.startsWith("image/") || ACCEPTED_IMAGE_EXTENSIONS.some((extension) => lowercaseName.endsWith(extension))
}

function getFileValidationError(file: File) {
    if (!isAcceptedImageFile(file)) {
        return "Please choose an image file. PDFs and other document types are not allowed."
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
        return "Image is too large. Maximum size is 10MB."
    }

    return null
}

export function VehicleImageUpload({
    imageUrl,
    selectedFile,
    onFileChange,
    isUploading = false,
    errorMessage,
    disabled = false,
    className,
    label = "Vehicle Photo",
}: VehicleImageUploadProps) {
    const inputRef = useRef<HTMLInputElement | null>(null)
    const [isDragActive, setIsDragActive] = useState(false)
    const [localError, setLocalError] = useState<string | null>(null)
    const previewUrl = useMemo(
        () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
        [selectedFile]
    )

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl)
            }
        }
    }, [previewUrl])

    const displayError = localError || errorMessage
    const currentPreviewUrl = previewUrl || withMediaCacheKey(imageUrl, "vehicle-photo") || null

    const handleCandidateFile = (file: File | null) => {
        if (!file) {
            return
        }

        const validationError = getFileValidationError(file)
        if (validationError) {
            setLocalError(validationError)
            return
        }

        setLocalError(null)
        void onFileChange(file)
    }

    const openFileDialog = () => {
        if (disabled) {
            return
        }

        inputRef.current?.click()
    }

    return (
        <div className={cn("space-y-3", className)}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-foreground">{label}</Label>
                {selectedFile && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1 text-xs text-muted-foreground"
                        onClick={() => {
                            setLocalError(null)
                            void onFileChange(null)
                        }}
                    >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Clear Selection
                    </Button>
                )}
            </div>

            <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                onClick={openFileDialog}
                onKeyDown={(event) => {
                    if ((event.key === "Enter" || event.key === " ") && !disabled) {
                        event.preventDefault()
                        openFileDialog()
                    }
                }}
                onDragEnter={(event) => {
                    event.preventDefault()
                    if (!disabled) {
                        setIsDragActive(true)
                    }
                }}
                onDragOver={(event) => {
                    event.preventDefault()
                    if (!disabled) {
                        setIsDragActive(true)
                    }
                }}
                onDragLeave={(event) => {
                    event.preventDefault()
                    if (event.currentTarget === event.target) {
                        setIsDragActive(false)
                    }
                }}
                onDrop={(event) => {
                    event.preventDefault()
                    setIsDragActive(false)
                    if (disabled) {
                        return
                    }
                    handleCandidateFile(event.dataTransfer.files?.[0] ?? null)
                }}
                className={cn(
                    "rounded-xl border-2 border-dashed border-border bg-muted/20 p-3.5 transition-colors",
                    !disabled && "cursor-pointer hover:border-primary/50 hover:bg-muted/40",
                    isDragActive && "border-primary bg-primary/5",
                    disabled && "cursor-not-allowed opacity-70"
                )}
            >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-background sm:w-36">
                        {currentPreviewUrl ? (
                            <img
                                src={currentPreviewUrl}
                                alt={`${label} preview`}
                                className="h-full w-full object-contain"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <ImageIcon className="h-10 w-10" />
                                <span className="text-xs">No photo selected</span>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 text-foreground">
                            {isUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : (
                                <Upload className="h-4 w-4 text-primary" />
                            )}
                            <span className="text-xs font-medium">
                                {isUploading
                                    ? "Uploading and processing image..."
                                    : "Click or drag"}
                            </span>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Allowed formats: JPG, JPEG, PNG, GIF, WebP, BMP, TIFF, AVIF. Maximum size: 10MB.
                        </p>
                        {/*<p className="text-xs text-muted-foreground">*/}
                        {/*    Selecting a new image replaces the current photo. Non-image files such as PDF are blocked.*/}
                        {/*</p>*/}
                        {selectedFile && (
                            <p className="text-xs text-foreground">
                                Selected file: <span className="font-medium">{selectedFile.name}</span>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_IMAGE_INPUT}
                className="hidden"
                disabled={disabled}
                onChange={(event) => {
                    handleCandidateFile(event.target.files?.[0] ?? null)
                    event.target.value = ""
                }}
            />

            {displayError && (
                <p className="text-sm text-red-500">{displayError}</p>
            )}
        </div>
    )
}
