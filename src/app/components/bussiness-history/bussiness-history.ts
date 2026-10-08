import { Component, Inject, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AsyncPipe, CommonModule } from '@angular/common';
import { SheetService } from '../../services/sheet-service';

interface MonthlyIncomeSummary {
  monthKey: string;
  label: string;
  chartLabel: string;
  actualIncome: number;
  discountedIncome: number;
}

@Component({
  selector: 'app-bussiness-history',
  imports: [AsyncPipe, CommonModule],
  templateUrl: './bussiness-history.html',
})
export class BussinessHistory implements OnInit {
  monthlyIncome$ = new BehaviorSubject<MonthlyIncomeSummary[]>([]);
  chartMonths$ = new BehaviorSubject<MonthlyIncomeSummary[]>([]);
  private incomeRanks = new Map<string, number>();
  maxMonthlyIncome = 0;

  constructor(@Inject(SheetService) private sheetService: SheetService) {}

  ngOnInit() {
    this.sheetService.consolidateData();

    this.sheetService.historyDataSubject.subscribe((rows) => {
      const monthlyIncome = this.buildMonthlyIncome(rows || []);
      this.monthlyIncome$.next(monthlyIncome);
      this.chartMonths$.next([...monthlyIncome].reverse());
      this.maxMonthlyIncome = Math.max(0, ...monthlyIncome.map((month) => month.discountedIncome));
      this.incomeRanks = new Map(
        [...monthlyIncome]
          .sort((first, second) => second.discountedIncome - first.discountedIncome)
          .slice(0, 3)
          .map((month, index) => [month.monthKey, index + 1])
      );
    });
  }

  incomeRank(monthKey: string): number | null {
    return this.incomeRanks.get(monthKey) ?? null;
  }

  get totalCollectedIncome(): number {
    return this.monthlyIncome$.value.reduce((total, month) => total + month.discountedIncome, 0);
  }

  barHeight(income: number): number {
    if (this.maxMonthlyIncome <= 0 || income <= 0) return 0;
    return Math.max(5, Math.round((income / this.maxMonthlyIncome) * 100));
  }

  private buildMonthlyIncome(rows: any[]): MonthlyIncomeSummary[] {
    const grouped = new Map<string, MonthlyIncomeSummary>();

    rows.forEach((row: any[]) => {
      const rawDate = (row?.[8] ?? '').toString().trim();
      if (!rawDate) return;

      const date = new Date(rawDate);
      if (Number.isNaN(date.getTime())) return;

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      const chartLabel = date.toLocaleString('en-US', { month: 'short' });

      const current = grouped.get(monthKey) ?? {
        monthKey,
        label,
        chartLabel,
        actualIncome: 0,
        discountedIncome: 0,
      };

      current.actualIncome += this.parseAmount(row?.[5]);
      current.discountedIncome += this.parseAmount(row?.[6]);
      grouped.set(monthKey, current);
    });

    return Array.from(grouped.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }

  private parseAmount(value: any): number {
    const clean = (value ?? '').toString().replace(/[$,]/g, '').trim();
    const parsed = Number(clean);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  formatCurrency(value: number): string {
    return `$${value.toFixed(2)}`;
  }
}
