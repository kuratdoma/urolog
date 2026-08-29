"use client"

import * as React from "react"
import { DayPicker, getDefaultClassNames, useDayPicker } from "react-day-picker"
import type { CalendarMonth } from "react-day-picker"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { DayButton } from "react-day-picker"

// ─── Turkish month names ───────────────────────────────────────────────────────
const TR_MONTHS = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
]

// ─── Year range helper ─────────────────────────────────────────────────────────
function buildYearRange(center: number, count = 16): number[] {
    const half = Math.floor(count / 2)
    return Array.from({ length: count }, (_, i) => center - half + i)
}

// ─── SmartCaption — uses useDayPicker() for navigation ────────────────────────
type OverlayMode = "month" | "year" | null

function SmartCaption({
    calendarMonth,
}: {
    calendarMonth: CalendarMonth
    displayIndex: number
}) {
    const { goToMonth } = useDayPicker()
    const [overlay, setOverlay] = React.useState<OverlayMode>(null)
    const [yearCenter, setYearCenter] = React.useState(
        () => calendarMonth.date.getFullYear()
    )

    const currentMonth = calendarMonth.date.getMonth()
    const currentYear = calendarMonth.date.getFullYear()

    const close = () => setOverlay(null)

    const selectMonth = (idx: number) => {
        goToMonth(new Date(currentYear, idx, 1))
        close()
    }

    const selectYear = (year: number) => {
        goToMonth(new Date(year, currentMonth, 1))
        setYearCenter(year)
        close()
    }

    const years = buildYearRange(yearCenter)

    return (
        <div className="relative flex items-center justify-center h-8 w-full">
            {/* Month label */}
            <button
                type="button"
                onClick={() => setOverlay(prev => (prev === "month" ? null : "month"))}
                className={cn(
                    "text-sm font-semibold text-slate-800 hover:text-blue-600 transition-colors",
                    "px-1.5 py-0.5 rounded-md hover:bg-blue-50 select-none",
                    overlay === "month" && "text-blue-600 bg-blue-50"
                )}
            >
                {TR_MONTHS[currentMonth]}
            </button>

            {/* Year label */}
            <button
                type="button"
                onClick={() => setOverlay(prev => (prev === "year" ? null : "year"))}
                className={cn(
                    "text-sm font-semibold text-slate-800 hover:text-blue-600 transition-colors",
                    "ml-1 px-1.5 py-0.5 rounded-md hover:bg-blue-50 select-none",
                    overlay === "year" && "text-blue-600 bg-blue-50"
                )}
            >
                {currentYear}
            </button>

            {/* ── Month Grid ── */}
            {overlay === "month" && (
                <div
                    className={cn(
                        "absolute top-9 left-1/2 -translate-x-1/2 z-50",
                        "w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-2",
                        "grid grid-cols-3 gap-1"
                    )}
                >
                    {TR_MONTHS.map((name, idx) => (
                        <button
                            key={name}
                            type="button"
                            onClick={() => selectMonth(idx)}
                            className={cn(
                                "rounded-lg py-1.5 text-xs font-medium transition-all",
                                "hover:bg-blue-50 hover:text-blue-700",
                                idx === currentMonth
                                    ? "bg-blue-600 text-white font-bold shadow-sm"
                                    : "text-slate-700"
                            )}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Year Grid ── */}
            {overlay === "year" && (
                <div
                    className={cn(
                        "absolute top-9 left-1/2 -translate-x-1/2 z-50",
                        "w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-2"
                    )}
                >
                    <div className="flex items-center justify-between mb-1.5 px-1">
                        <button
                            type="button"
                            onClick={() => setYearCenter(c => c - 16)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                        >
                            <ChevronLeftIcon className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            {years[0]} – {years[years.length - 1]}
                        </span>
                        <button
                            type="button"
                            onClick={() => setYearCenter(c => c + 16)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                        >
                            <ChevronRightIcon className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                        {years.map(year => (
                            <button
                                key={year}
                                type="button"
                                onClick={() => selectYear(year)}
                                className={cn(
                                    "rounded-lg py-1.5 text-xs font-medium transition-all",
                                    "hover:bg-blue-50 hover:text-blue-700",
                                    year === currentYear
                                        ? "bg-blue-600 text-white font-bold shadow-sm"
                                        : "text-slate-700"
                                )}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Outside click trap */}
            {overlay && (
                <div className="fixed inset-0 z-40" onClick={close} />
            )}
        </div>
    )
}

// ─── SmartCalendarDayButton ────────────────────────────────────────────────────
function SmartCalendarDayButton({
    className,
    day,
    modifiers,
    ...props
}: React.ComponentProps<typeof DayButton>) {
    const defaultClassNames = getDefaultClassNames()
    const ref = React.useRef<HTMLButtonElement>(null)
    React.useEffect(() => {
        if (modifiers.focused) ref.current?.focus()
    }, [modifiers.focused])

    return (
        <Button
            ref={ref}
            variant="ghost"
            size="icon"
            data-day={day.date.toLocaleDateString()}
            data-selected-single={
                modifiers.selected &&
                !modifiers.range_start &&
                !modifiers.range_end &&
                !modifiers.range_middle
            }
            data-range-start={modifiers.range_start}
            data-range-end={modifiers.range_end}
            data-range-middle={modifiers.range_middle}
            className={cn(
                "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground",
                "data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground",
                "data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground",
                "data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground",
                "group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50",
                "dark:hover:text-accent-foreground flex aspect-square size-auto w-full min-w-(--cell-size)",
                "flex-col gap-1 leading-none font-normal",
                "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10",
                "group-data-[focused=true]/day:ring-[3px]",
                "data-[range-end=true]:rounded-md data-[range-start=true]:rounded-md",
                "data-[range-middle=true]:rounded-none",
                "[&>span]:text-xs [&>span]:opacity-70",
                defaultClassNames.day,
                className
            )}
            {...props}
        />
    )
}

// ─── SmartCalendar — drop-in replacement for Calendar ─────────────────────────
function SmartCalendar({
    className,
    classNames,
    showOutsideDays = true,
    formatters,
    components,
    ...props
}: React.ComponentProps<typeof DayPicker> & {
    buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
    const defaultClassNames = getDefaultClassNames()

    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            captionLayout="label"
            className={cn(
                "bg-background group/calendar p-3 [--cell-size:--spacing(8)]",
                "[[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
                String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
                String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
                className
            )}
            formatters={{
                formatMonthDropdown: (date) =>
                    date.toLocaleString("tr-TR", { month: "short" }),
                ...formatters,
            }}
            classNames={{
                root: cn("w-fit", defaultClassNames.root),
                months: cn("flex gap-4 flex-col md:flex-row relative", defaultClassNames.months),
                month: cn("flex flex-col w-full gap-4", defaultClassNames.month),
                nav: cn(
                    "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between pointer-events-none z-10",
                    defaultClassNames.nav
                ),
                button_previous: cn(
                    buttonVariants({ variant: "ghost" }),
                    "size-(--cell-size) aria-disabled:opacity-50 p-0 select-none pointer-events-auto",
                    defaultClassNames.button_previous
                ),
                button_next: cn(
                    buttonVariants({ variant: "ghost" }),
                    "size-(--cell-size) aria-disabled:opacity-50 p-0 select-none pointer-events-auto",
                    defaultClassNames.button_next
                ),
                month_caption: cn(
                    "flex items-center justify-center h-(--cell-size) w-full px-(--cell-size) relative z-20",
                    defaultClassNames.month_caption
                ),
                caption_label: cn(
                    "select-none font-medium text-sm",
                    defaultClassNames.caption_label
                ),
                table: "w-full border-collapse",
                weekdays: cn("flex", defaultClassNames.weekdays),
                weekday: cn(
                    "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none",
                    defaultClassNames.weekday
                ),
                week: cn("flex w-full mt-2", defaultClassNames.week),
                week_number_header: cn("select-none w-(--cell-size)", defaultClassNames.week_number_header),
                week_number: cn("text-[0.8rem] select-none text-muted-foreground", defaultClassNames.week_number),
                day: cn(
                    "relative w-full h-full p-0 text-center group/day aspect-square select-none",
                    "[&:last-child[data-selected=true]_button]:rounded-r-md",
                    "[&:first-child[data-selected=true]_button]:rounded-l-md",
                    defaultClassNames.day
                ),
                range_start: cn("rounded-l-md bg-accent", defaultClassNames.range_start),
                range_middle: cn("rounded-none", defaultClassNames.range_middle),
                range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
                today: cn(
                    "bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none",
                    defaultClassNames.today
                ),
                outside: cn("text-muted-foreground aria-selected:text-muted-foreground", defaultClassNames.outside),
                disabled: cn("text-muted-foreground opacity-50", defaultClassNames.disabled),
                hidden: cn("invisible", defaultClassNames.hidden),
                ...classNames,
            }}
            components={{
                Root: ({ className: rootCls, rootRef, ...rootProps }) => (
                    <div data-slot="calendar" ref={rootRef} className={cn(rootCls)} {...rootProps} />
                ),
                Chevron: ({ className: chevCls, orientation, ...chevProps }) => {
                    if (orientation === "left")
                        return <ChevronLeftIcon className={cn("size-4", chevCls)} {...chevProps} />
                    if (orientation === "right")
                        return <ChevronRightIcon className={cn("size-4", chevCls)} {...chevProps} />
                    return <></>
                },
                MonthCaption: SmartCaption,
                DayButton: SmartCalendarDayButton,
                WeekNumber: ({ children, ...wnProps }) => (
                    <td {...wnProps}>
                        <div className="flex size-(--cell-size) items-center justify-center text-center">
                            {children}
                        </div>
                    </td>
                ),
                ...components,
            }}
            {...props}
        />
    )
}

export { SmartCalendar }
