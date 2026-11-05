import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "@/lib/utils";

const RadioGroup = React.forwardRef<React.ElementRef<typeof RadioGroupPrimitive.Root>, React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root className={cn("grid gap-2", className)} {...props} ref={ref} />
));
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

/* A whole tile is the radio: big target, clear checked state (green border + light green fill + radio dot). */
const RadioTile = React.forwardRef<React.ElementRef<typeof RadioGroupPrimitive.Item>, React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>>(({ className, children, ...props }, ref) => (
  <RadioGroupPrimitive.Item ref={ref}
    className={cn("group relative flex min-h-14 w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-input data-[state=checked]:border-brand data-[state=checked]:bg-brand-soft data-[state=checked]:shadow-[inset_0_0_0_1px_hsl(var(--brand))] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-soft focus-visible:border-ring", className)}
    {...props}>
    {children}
    <span aria-hidden="true" className="ml-auto grid size-5 shrink-0 place-items-center rounded-full border-2 border-input bg-card group-data-[state=checked]:border-brand">
      <span className="size-2.5 rounded-full bg-brand opacity-0 group-data-[state=checked]:opacity-100" />
    </span>
  </RadioGroupPrimitive.Item>
));
RadioTile.displayName = "RadioTile";
export { RadioGroup, RadioTile };
