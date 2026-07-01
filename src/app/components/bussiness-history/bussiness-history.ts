import { Component, Inject, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AsyncPipe, CommonModule } from '@angular/common';
import { SheetService } from '../../services/sheet-service';

interface MonthlyIncomeSummary {
  monthKey: string;
  label: string;
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

  constructor(@Inject(SheetService) private sheetService: SheetService) {}

  ngOnInit() {
    this.sheetService.consolidateData();

    this.sheetService.historyDataSubject.subscribe((rows) => {
      this.monthlyIncome$.next(this.buildMonthlyIncome(rows || []));
    });
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

      const current = grouped.get(monthKey) ?? {
        monthKey,
        label,
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
