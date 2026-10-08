import { Component, Inject } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { SheetService } from '../../services/sheet-service';

type DateRange = 'all' | 'year';

interface CustomerSummary {
  name: string;
  visits: number;
  revenue: number;
  lastVisit: Date | null;
  daysSinceVisit: number | null;
}

interface CustomerInsightsData {
  customers: number;
  jobs: number;
  inactive: number;
  mostFrequent: CustomerSummary[];
  dueForReturn: CustomerSummary[];
}

@Component({
  selector: 'app-customer-insights',
  imports: [AsyncPipe, CommonModule, FormsModule],
  templateUrl: './customer-insights.html',
})
export class CustomerInsights {
  selectedRange: DateRange = 'all';
  inactivityDays = 90;
  searchTerm = '';
  showAllFrequent = false;

  private readonly range$ = new BehaviorSubject<DateRange>('all');
  private readonly inactivityDays$ = new BehaviorSubject<number>(90);
  private readonly searchTerm$ = new BehaviorSubject<string>('');

  insights$: Observable<CustomerInsightsData>;

  constructor(@Inject(SheetService) sheetService: SheetService) {
    this.insights$ = combineLatest([
      sheetService.historyDataSubject,
      this.range$,
      this.inactivityDays$,
      this.searchTerm$,
    ]).pipe(
      map(([rows, range, inactivityDays, searchTerm]) =>
        this.buildInsights(rows, range, inactivityDays, searchTerm)
      )
    );
  }

  onRangeChange(range: DateRange): void {
    this.range$.next(range);
  }

  onInactivityDaysChange(days: number): void {
    this.inactivityDays$.next(Number(days));
  }

  onSearchChange(searchTerm: string): void {
    this.searchTerm$.next(searchTerm);
  }

  private buildInsights(
    rows: any[],
    range: DateRange,
    inactivityDays: number,
    searchTerm: string
  ): CustomerInsightsData {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();
    const customers = new Map<string, CustomerSummary & { allVisits: number }>();

    for (const row of Array.isArray(rows) ? rows : []) {
      const name = (row?.[1] ?? '').toString().trim();
      if (!name) continue;

      const key = name.toLocaleLowerCase();
      const visitDate = this.parseDate(row?.[8]);
      const customer = customers.get(key) ?? {
        name,
        visits: 0,
        allVisits: 0,
        revenue: 0,
        lastVisit: null,
        daysSinceVisit: null,
      };

      customer.allVisits++;
      if (range === 'all' || visitDate?.getFullYear() === year) {
        customer.visits++;
        customer.revenue += this.parseAmount(row?.[6]);
      }
      if (visitDate && (!customer.lastVisit || visitDate > customer.lastVisit)) {
        customer.lastVisit = visitDate;
      }
      customers.set(key, customer);
    }

    const query = searchTerm.trim().toLocaleLowerCase();
    const summaries = [...customers.values()]
      .filter((customer) => !query || customer.name.toLocaleLowerCase().includes(query))
      .map(({ allVisits, ...customer }) => {
        const daysSinceVisit = customer.lastVisit
          ? Math.max(0, Math.floor((today.getTime() - customer.lastVisit.getTime()) / 86400000))
          : null;
        return { ...customer, daysSinceVisit };
      });

    const mostFrequent = summaries
      .filter((customer) => customer.visits > 0)
      .sort((a, b) => b.visits - a.visits || (b.lastVisit?.getTime() ?? 0) - (a.lastVisit?.getTime() ?? 0));
    const dueForReturn = summaries
      .filter((customer) => customer.daysSinceVisit !== null && customer.daysSinceVisit >= inactivityDays)
      .sort((a, b) => (b.daysSinceVisit ?? 0) - (a.daysSinceVisit ?? 0));

    return {
      customers: summaries.length,
      jobs: summaries.reduce((total, customer) => total + customer.visits, 0),
      inactive: dueForReturn.length,
      mostFrequent,
      dueForReturn,
    };
  }

  private parseDate(value: unknown): Date | null {
    const raw = (value ?? '').toString().trim();
    if (!raw) return null;

    const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(raw);
    if (isoMatch) {
      return this.validDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
    }

    const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
    if (slashMatch) {
      return this.validDate(Number(slashMatch[3]), Number(slashMatch[1]), Number(slashMatch[2]));
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private validDate(year: number, month: number, day: number): Date | null {
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      ? date
      : null;
  }

  private parseAmount(value: unknown): number {
    const amount = Number((value ?? '').toString().replace(/[$,\s]/g, ''));
    return Number.isFinite(amount) ? amount : 0;
  }
}