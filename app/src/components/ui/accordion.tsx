import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const Accordion = AccordionPrimitive.Root;
const AccordionItem = React.forwardRef<React.ElementRef<typeof AccordionPrimitive.Item>, React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item ref={ref} className={cn("border-b last:border-b-0", className)} {...props} />
));
AccordionItem.displayName = "AccordionItem";
const AccordionTrigger = React.forwardRef<React.ElementRef<typeof AccordionPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & { level?: 2 | 3 }>(({ className, children, level = 3, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex" asChild={level === 2}>{level === 2 ? <h2 className="m-0 flex text-base">{trigger(ref, className, children, props)}</h2> : trigger(ref, className, children, props)}</AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;
function trigger(ref: React.ForwardedRef<HTMLButtonElement>, className: string | undefined, children: React.ReactNode, props: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Trigger ref={ref}
      className={cn("flex flex-1 items-center justify-between gap-4 py-4 text-left text-base font-semibold transition-colors hover:text-brand [&[data-state=open]>svg]:rotate-180 focus-visible:rounded-md", className)}
      {...props}>
      {children}
      <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform duration-200" aria-hidden="true" />
    </AccordionPrimitive.Trigger>
  );
}
const AccordionContent = React.forwardRef<React.ElementRef<typeof AccordionPrimitive.Content>, React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content ref={ref} className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down" {...props}>
    <div className={cn("pb-5 pt-0 text-base", className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
