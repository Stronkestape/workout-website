declare module 'react-big-calendar' {
  import * as React from 'react';

  export type View = 'month' | 'week' | 'work_week' | 'day' | 'agenda' | string;
  export type NavigateAction = 'PREV' | 'NEXT' | 'TODAY' | 'DATE';

  export interface DateLocalizer {
    format: (value: any, format: string, culture?: string) => string;
    parse: (value: string, format: string, culture?: string) => Date;
    startOfWeek: (culture?: string) => number;
    getDay: (date: Date) => number;
    locales: Record<string, any>;
  }

  export function dateFnsLocalizer(config: {
    format: (date: Date, format: string, options?: any) => string;
    parse: (dateStr: string, format: string, baseDate: Date, options?: any) => Date;
    startOfWeek: (date: Date, options?: any) => Date;
    getDay: (date: Date) => number;
    locales: Record<string, any>;
  }): DateLocalizer;

  export interface Components<TEvent extends object = object> {
    event?: React.ComponentType<{ event: TEvent; title: string }>;
    eventWrapper?: React.ComponentType<any>;
    eventContainerWrapper?: React.ComponentType<any>;
    dateCellWrapper?: React.ComponentType<any>;
    timeSlotWrapper?: React.ComponentType<any>;
    timeGutterHeader?: React.ComponentType<any>;
    timeGutterWrapper?: React.ComponentType<any>;
    toolbar?: React.ComponentType<any>;
    agenda?: {
      date?: React.ComponentType<any>;
      time?: React.ComponentType<any>;
      event?: React.ComponentType<any>;
    };
    day?: {
      header?: React.ComponentType<any>;
      event?: React.ComponentType<any>;
    };
    week?: {
      header?: React.ComponentType<any>;
      event?: React.ComponentType<any>;
    };
    month?: {
      header?: React.ComponentType<any>;
      dateHeader?: React.ComponentType<any>;
      event?: React.ComponentType<any>;
    };
    header?: React.ComponentType<{ date: Date; label: string; localizer: DateLocalizer }>;
  }

  export interface CalendarProps<TEvent extends object = object> {
    localizer: DateLocalizer;
    events?: TEvent[];
    startAccessor?: keyof TEvent | ((event: TEvent) => Date);
    endAccessor?: keyof TEvent | ((event: TEvent) => Date);
    titleAccessor?: keyof TEvent | ((event: TEvent) => string);
    allDayAccessor?: keyof TEvent | ((event: TEvent) => boolean);
    style?: React.CSSProperties;
    culture?: string;
    view?: View;
    onView?: (view: View) => void;
    date?: Date;
    getNow?: () => Date;
    onNavigate?: (newDate: Date, view: View, action: NavigateAction) => void;
    views?: View[] | Record<string, boolean | React.ComponentType<any>>;
    components?: Components<TEvent>;
    eventPropGetter?: (
      event: TEvent,
      start: Date,
      end: Date,
      isSelected: boolean
    ) => { className?: string; style?: React.CSSProperties };
    step?: number;
    timeslots?: number;
    min?: Date;
    max?: Date;
    scrollToTime?: Date;
    showMultiDayTimes?: boolean;
    onSelectEvent?: (event: TEvent, e: React.SyntheticEvent) => void;
  }

  export class Calendar<TEvent extends object = object> extends React.Component<CalendarProps<TEvent>> {}
}
