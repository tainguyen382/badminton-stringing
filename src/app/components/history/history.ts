import { Component, Inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, combineLatest, forkJoin, Observable } from 'rxjs';
import { map, startWith, shareReplay } from 'rxjs/operators';
import { SheetService } from '../../services/sheet-service';
import { AsyncPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-history',
  imports: [AsyncPipe, CommonModule, FormsModule],
  templateUrl: './history.html',
})
export class History implements AfterViewInit {
  // raw data from service (assigned in constructor)
  historyData$!: Observable<any[]>;

  // reactive state
  currentPage$ = new BehaviorSubject<number>(1);
  itemsPerPage = 10;
  searchTerm$ = new BehaviorSubject<string>('');
  bulkPayment = 'Unpaid';
  isBulkUpdating = false;
  selectedRows = new Set<number>();
  pageLoading = false;

  filteredData$: Observable<any[]>;
  paginatedData$: Observable<any[]>;
  totalPages$: Observable<number>;
  paymentOptions$: Observable<string[]>;

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  constructor(@Inject(SheetService) private sheetService: SheetService, private router: Router) {
    // ensure initial fetch
    this.sheetService.consolidateData();

    // assign raw observable from the injected service (must be set before using)
    this.historyData$ = this.sheetService.historyDataSubject;
    this.paymentOptions$ = this.sheetService.paymentTypesSubject.pipe(
      map((values) => (Array.isArray(values) ? values : []).map((value) => value?.toString().trim()).filter(Boolean)),
      shareReplay(1)
    );

    this.paymentOptions$.subscribe((options) => {
      if (!options.length) return;
      const defaultOption = options.find((item) => item.toLowerCase() === 'unpaid') || options[0];
      if (!this.bulkPayment || !options.includes(this.bulkPayment)) {
        this.bulkPayment = defaultOption;
      }
    });

    // filtered data = combine raw data + search term
    this.filteredData$ = combineLatest<[any[], string]>([
      (this.historyData$ as Observable<any[]>).pipe(startWith([] as any[])),
      this.searchTerm$.pipe(startWith('')),
    ]).pipe(
      map((vals) => {
        const data = vals[0] as any[];
        const term = vals[1] as string;
        const t = (term || '').toString().trim().toLowerCase();
        if (!t) return Array.isArray(data) ? data : [];
        return (Array.isArray(data) ? data : []).filter((row: any[]) =>
          row.some((cell) => (cell ?? '').toString().toLowerCase().includes(t))
        );
      }),
      shareReplay(1)
    );

    // total pages derived from filtered data
    this.totalPages$ = this.filteredData$.pipe(
      map((d) => Math.max(1, Math.ceil(((d || []) as any[]).length / this.itemsPerPage))),
      shareReplay(1)
    );

    // paginated data derived from filteredData and currentPage$
    this.paginatedData$ = combineLatest<[any[], number]>([
      this.filteredData$,
      this.currentPage$.pipe(startWith(1)),
    ]).pipe(
      map((vals) => {
        const data = vals[0] as any[];
        const page = vals[1] as number;
        const startIndex = (page - 1) * this.itemsPerPage;
        return (data || []).slice(startIndex, startIndex + this.itemsPerPage);
      }),
      shareReplay(1)
    );
  }

  repeatJob(row: any[]) {
    const [id, name, racketModel, tension, stringType, servicePrice, revenue, paymentMethod, date] = row;
    this.router.navigate(['/stringing'], {
      queryParams: {
        name: name || '',
        racketModel: racketModel || '',
        tension: tension || '',
        stringType: stringType || '',
        paymentMethod: 'Unpaid',
        servicePrice: servicePrice ? servicePrice.toString().replace(/\$/g, '') : '',
        date: this.getLocalDateString()
      }
    });
  }

  editJob(row: any[]) {
    const parsedRowId = row && row.length > 0 ? Number(row[0]) : NaN;
    const sheetRowId = Number.isFinite(parsedRowId) ? parsedRowId : undefined;
    const [id, name, racketModel, tension, stringType, servicePrice, revenue, paymentMethod, date] = row;
    this.router.navigate(['/stringing'], {
      queryParams: {
        name: name || '',
        racketModel: racketModel || '',
        tension: tension || '',
        stringType: stringType || '',
        paymentMethod: paymentMethod || '',
        servicePrice: servicePrice ? servicePrice.toString().replace(/\$/g, '') : '',
        discount: this.getDiscountValue(servicePrice, revenue),
        date: this.convertDateFormat(date || this.getLocalDateString()),
        edit: 'true',
        rowId: sheetRowId
      }
    });
  }

  private getDiscountValue(servicePrice: any, revenue: any): string {
    const parseAmount = (value: any): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const normalized = value.toString().replace(/[$,\s]/g, '');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const price = parseAmount(servicePrice);
    const earned = parseAmount(revenue);

    if (price === null || earned === null) {
      return '';
    }

    const discount = Math.max(0, price - earned);
    return Number.isFinite(discount) ? discount.toString() : '';
  }

  private getLocalDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private convertDateFormat(dateStr: string): string {
    if (!dateStr) return this.getLocalDateString();
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    const month = String(parts[0]).padStart(2, '0');
    const day = String(parts[1]).padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  ngAfterViewInit(): void {
    try {
      if (this.searchInput && this.searchInput.nativeElement) {
        this.searchInput.nativeElement.value = '';
      }
    } catch (e) {
      // ignore
    }
  }

  

  getRowId(row: any[]): number | null {
    const parsedRowId = row && row.length > 0 ? Number(row[0]) : NaN;
    return Number.isFinite(parsedRowId) ? parsedRowId : null;
  }

  isRowSelected(row: any[]): boolean {
    const rowId = this.getRowId(row);
    return rowId !== null && this.selectedRows.has(rowId);
  }

  toggleRowSelection(row: any[]): void {
    const rowId = this.getRowId(row);
    if (rowId === null) return;

    if (this.selectedRows.has(rowId)) {
      this.selectedRows.delete(rowId);
    } else {
      this.selectedRows.add(rowId);
    }
  }

  clearSelection(): void {
    this.selectedRows.clear();
  }

  applyBulkPayment(): void {
    if (this.selectedRows.size === 0 || !this.bulkPayment.trim()) {
      return;
    }

    this.isBulkUpdating = true;
    this.pageLoading = true;
    this.historyData$.subscribe((rows) => {
      const selectedIds = (rows || [])
        .map((row) => this.getRowId(row))
        .filter((rowId): rowId is number => rowId !== null && this.selectedRows.has(rowId));

      if (!selectedIds.length) {
        this.isBulkUpdating = false;
        this.pageLoading = false;
        return;
      }

      this.sheetService.bulkUpdatePayment(selectedIds, this.bulkPayment.trim()).subscribe({
        next: () => {
          this.selectedRows.clear();
          this.sheetService.consolidateData();
          this.isBulkUpdating = false;
          this.pageLoading = false;
        },
        error: () => {
          this.isBulkUpdating = false;
          this.pageLoading = false;
          alert('Bulk payment update failed.');
        }
      });
    });
  }

  // pagination controls operate on currentPage$
  nextPage() {
    this.currentPage$.next(Math.min((this.currentPage$.value || 1) + 1, Number.MAX_SAFE_INTEGER));
  }

  previousPage() {
    this.currentPage$.next(Math.max((this.currentPage$.value || 1) - 1, 1));
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const raw = (input?.value ?? '');
    this.searchTerm$.next(raw.toString());
    this.currentPage$.next(1);
  }

  getPaymentClass(payment: string) {
    const normalized = (payment ?? '').toString().trim().toLowerCase();

    switch (normalized) {
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      case 'venmo':
        return 'bg-blue-100 text-blue-800';
      case 'cash':
        return 'bg-green-100 text-green-800';
      case 'zelle':
        return 'bg-purple-100 text-purple-800';
      case 'apple pay':
        return 'bg-black text-white';
      case 'free':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
