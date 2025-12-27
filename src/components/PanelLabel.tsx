import React from 'react'

interface PanelLabelProps {
  children: React.ReactNode
  className?: string
}

const PanelLabel = ({ children, className = "" }: PanelLabelProps) => {
  return (
    <span className={`text-[10px] uppercase tracking-[0.25em] font-medium text-muted-foreground/70 ${className}`}>
      {children}
    </span>
  )
}

export default PanelLabel