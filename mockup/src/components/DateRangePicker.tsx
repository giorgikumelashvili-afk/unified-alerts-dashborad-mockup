import { CalendarDays } from "lucide-react";
import type { DateRange as RdpRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DateRange } from "@/types";
import { formatDate } from "@/lib/utils";

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: Props) {
  const handleSelect = (r: RdpRange | undefined) => {
    if (r?.from && r?.to) onChange({ from: r.from, to: r.to });
    else if (r?.from) onChange({ from: r.from, to: r.from });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 w-[16rem] justify-start gap-2 font-normal">
          <CalendarDays className="h-4 w-4 opacity-70" />
          {formatDate(value.from)} &ndash; {formatDate(value.to)}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Calendar
          mode="range"
          numberOfMonths={2}
          captionLayout="dropdown-buttons"
          fromYear={2024}
          toYear={2027}
          defaultMonth={value.from}
          selected={{ from: value.from, to: value.to }}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  );
}
