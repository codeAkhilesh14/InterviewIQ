import React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils.js"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium " +
    "transition-colors disabled:pointer-events-none disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:opacity-90",
                secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
                outline: "border border-border bg-transparent hover:bg-accent",
                ghost: "bg-transparent hover:bg-accent",
                destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
                link: "text-primary underline-offset-4 hover:underline p-0 h-auto"
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-8 px-3 text-xs",
                lg: "h-12 px-6 text-base",
                icon: "h-9 w-9 p-0"
            }
        },
        defaultVariants: { variant: "default", size: "default" }
    }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
})
Button.displayName = "Button"

export { Button, buttonVariants }
