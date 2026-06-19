import { Component, Inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SheetService } from '../../services/sheet-service';
import { AsyncPipe, CommonModule } from '@angular/common';

@Component({
  selector: 'app-expense',
  imports: [AsyncPipe, CommonModule],
  templateUrl: './expense.html',
})
export class Expense {
  expenseData$ = new BehaviorSubject<any>([]);
  currentPage = 1;
  itemsPerPage = 10;

  constructor(@Inject(SheetService) private sheetService: SheetService) {
    this.sheetService.expenseDataSubject.subscribe((data) => {
      this.expenseData$.next(data);
      this.currentPage = 1;
    });
  }

  get paginatedData() {
    const data = this.expenseData$.value || [];
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return data.slice(startIndex, endIndex);
  }

  get totalPages() {
    const data = this.expenseData$.value || [];
    return Math.ceil(data.length / this.itemsPerPage);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }
}
