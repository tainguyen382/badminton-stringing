import { Component, Inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, startWith, shareReplay } from 'rxjs/operators';
import { SheetService } from '../../services/sheet-service';
import { AsyncPipe, CommonModule } from '@angular/common';

@Component({
  selector: 'app-history',
  imports: [AsyncPipe, CommonModule],
  templateUrl: './history.html',
})
export class History implements AfterViewInit {
  // raw data from service (assigned in constructor)
  historyData$!: Observable<any[]>;

  // reactive state
  currentPage$ = new BehaviorSubject<number>(1);
  itemsPerPage = 10;
  searchTerm$ = new BehaviorSubject<string>('');

  filteredData$: Observable<any[]>;
  paginatedData$: Observable<any[]>;
  totalPages$: Observable<number>;

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  constructor(@Inject(SheetService) private sheetService: SheetService, private router: Router) {
    // ensure initial fetch
    this.sheetService.consolidateData();

    // assign raw observable from the injected service (must be set before using)
    this.historyData$ = this.sheetService.historyDataSubject;

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
    const [type, name, racketModel, tension, stringType, servicePrice, , paymentMethod, , date] = row;
    this.router.navigate(['/stringing'], {
      queryParams: {
        name: name || '',
        racketModel: racketModel || '',
        tension: tension || '',
        stringType: stringType || '',
        paymentMethod: paymentMethod || '',
        servicePrice: servicePrice ? servicePrice.toString().replace(/\$/g, '') : '',
        date: this.getLocalDateString()
      }
    });
  }

  editJob(row: any[]) {
    const sheetRowId = row && row.length > 14 ? row[14] : undefined;
    const [type, name, racketModel, tension, stringType, servicePrice, , paymentMethod, , date] = row;
    this.router.navigate(['/stringing'], {
      queryParams: {
        name: name || '',
        racketModel: racketModel || '',
        tension: tension || '',
        stringType: stringType || '',
        paymentMethod: paymentMethod || '',
        servicePrice: servicePrice ? servicePrice.toString().replace(/\$/g, '') : '',
        date: date || this.getLocalDateString(),
        edit: 'true',
        rowId: sheetRowId
      }
    });
  }

  private getLocalDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
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
