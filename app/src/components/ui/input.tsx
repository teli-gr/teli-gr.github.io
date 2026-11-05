import * as React from "react";
import { cn } from "@/lib/utils";
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
  <input type={type} ref={ref}
    className={cn("flex h-11 w-full rounded-lg border border-input bg-card px-3 text-lg font-semibold num placeholder:text-muted-foreground/70 placeholder:font-normal focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-brand-soft disabled:opacity-50", className)}
    {...props} />
));
Input.displayName = "Input";
export { Input };
