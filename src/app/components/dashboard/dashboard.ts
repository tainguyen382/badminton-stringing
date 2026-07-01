import { Component, Inject, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SheetService } from '../../services/sheet-service';
import { AsyncPipe } from '@angular/common';
import { dashboardData } from '../../interface/data-interface';

@Component({
  selector: 'app-dashboard',
  imports: [AsyncPipe],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  dashboardData$: BehaviorSubject<dashboardData | null> = new BehaviorSubject<dashboardData | null>(null);

  constructor(@Inject(SheetService) private sheetService: SheetService) {}

  formatCurrency(value: number | string | null | undefined): string {
    const numericValue = Number(value ?? 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
  }

  ngOnInit() {
    this.sheetService.dashboardDataSubject.subscribe((data) => {
      this.dashboardData$.next(data);
    });

    this.sheetService.consolidateData();
  }
}


