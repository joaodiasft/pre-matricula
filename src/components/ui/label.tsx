import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const Label = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot> & { requiredMark?: boolean }
>(({ className, requiredMark, ...props }, ref) => (
  <Slot
    ref={ref}
    className={cn(
      "text-sm font-medium text-muted-foreground",
      requiredMark && "after:ml-1 after:text-destructive after:content-['*']",
      className
    )}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
