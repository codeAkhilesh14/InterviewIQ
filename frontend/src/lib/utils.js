import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Standard shadcn/ui helper - merges conditional class names and resolves
// conflicting Tailwind utility classes (e.g. "p-2 p-4" -> "p-4").
export const cn = (...inputs) => twMerge(clsx(inputs))
