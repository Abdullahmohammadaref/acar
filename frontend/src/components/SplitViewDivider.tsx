import React, { useState, useRef } from 'react'

interface SplitViewDividerProps {
    onDrag: (deltaX: number) => void
    onDragStart?: () => void
    onDragEnd?: () => void
    className?: string
    handlePosition?: 'center' | 'top'
}

export function SplitViewDivider({ onDrag, onDragStart, onDragEnd, className = "hidden 2xl:flex", handlePosition = 'center' }: SplitViewDividerProps) {
    const [isDragging, setIsDragging] = useState(false)
    const lastXRef = useRef<number>(0)

    const handlePointerDown = (e: React.PointerEvent) => {
        const target = e.currentTarget as HTMLDivElement
        target.setPointerCapture(e.pointerId)
        setIsDragging(true)
        lastXRef.current = e.clientX
        document.body.style.cursor = 'col-resize'
        onDragStart?.()
    }

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return
        
        const deltaX = e.clientX - lastXRef.current
        lastXRef.current = e.clientX
        onDrag(deltaX)
    }

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging) return
        const target = e.currentTarget as HTMLDivElement
        target.releasePointerCapture(e.pointerId)
        setIsDragging(false)
        document.body.style.cursor = ''
        onDragEnd?.()
    }

    return (
        <div 
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`
                flex flex-col items-center justify-center 
                w-12 group cursor-col-resize self-stretch z-10 touch-none transition-colors
                ${isDragging ? 'bg-primary/5' : 'hover:bg-primary/5'}
                ${className}
            `}
        >
            {/* Visual Line */}
            <div className={`
                w-px h-full bg-border/40 transition-colors
                ${isDragging ? 'bg-primary/40' : 'group-hover:bg-primary/40'}
            `} />
            
            {/* Draggable Handle */}
            <div className={`
                absolute w-1.5 h-16 rounded-full transition-all duration-200 shadow-sm
                ${isDragging ? 'bg-primary h-24 shadow-primary/20' : 'bg-border group-hover:bg-primary/60'}
                ${handlePosition === 'top' ? 'top-32' : ''}
            `} />
        </div>
    )
}
