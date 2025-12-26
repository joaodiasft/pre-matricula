"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-between items-center text-sm font-medium",
        caption_label: "text-base font-semibold",
        nav: "flex gap-2",
        nav_button:
          "h-8 w-8 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-primary",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "w-9 text-center text-xs font-medium uppercase text-muted-foreground",
        row: "mt-2 flex w-full",
        cell: "relative flex h-9 w-9 items-center justify-center text-sm focus-within:relative focus-within:z-20",
        day: "h-9 w-9 rounded-full text-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        day_today: "border border-primary text-primary font-medium",
        day_outside: "text-muted-foreground/70 opacity-70",
        day_disabled: "opacity-30",
        ...classNames,
      }}
      {...props}
    />
  );
}
