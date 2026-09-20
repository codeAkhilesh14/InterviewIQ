import React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils.js"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
    {
        variants: {
            variant: {
                default: "border-transparent bg-primary text-primary-foreground",
                secondary: "border-transparent bg-secondary text-secondary-foreground",
                outline: "border-border text-foreground",
                success: "border-transparent bg-success/15 text-success",
                warning: "border-transparent bg-warning/20 text-warning",
                destructive: "border-transparent bg-destructive/15 text-destructive"
            }
        },
        defaultVariants: { variant: "default" }
    }
)

const Badge = ({ className, variant, ...props }) => (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
)

export { Badge, badgeVariants }
