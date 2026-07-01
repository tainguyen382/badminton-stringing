import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, from } from 'rxjs';
import { dashboardData, historyData } from '../interface/data-interface';

@Injectable({
  providedIn: 'root'
})
export class SheetService {

  private sheetId = '1cl46y3814vtH_pioiqJrIqv0v2mQmdIxOKt_B7Cixu8';
  private apiKey = 'AIzaSyAUa8sDxU-_ThANMSlDf5Fc6IGlm470GPo';
  private allData = encodeURIComponent("'Current Year Revenue/Expense'!A:Z");

  private stringListRange = encodeURIComponent("'StaticInfo'!A:Z");

  private paymentTypesRange = encodeURIComponent("'StaticInfo'!B:Z");

  private expenseDataRange = encodeURIComponent("'All Time Expense'!A:Z");

  //dashboard
  private dashboardData$ = new BehaviorSubject<dashboardData | any>([]);
  readonly dashboardDataSubject = this.dashboardData$.asObservable();
  //string types
  private stringList$ = new BehaviorSubject<any>([]);
  readonly stringListSubject = this.stringList$.asObservable();
  //payment types
  private paymentTypes$ = new BehaviorSubject<any>([]);
  readonly paymentTypesSubject = this.paymentTypes$.asObservable();
  //history data
  private historyData$ = new BehaviorSubject<historyData | any>([]);
  readonly historyDataSubject = this.historyData$.asObservable();

  private expenseData$ = new BehaviorSubject<historyData | any>([]);
  readonly expenseDataSubject = this.expenseData$.asObservable();

  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();

  // Optional write endpoint for Google Apps Script web app.
  // Deploy your Apps Script as a Web App and paste the URL here.
  appendWebAppUrl = 'https://script.google.com/macros/s/AKfycbyj33X_2qYXuMAT4A3TysKxRaua_vQIGZX-vgVivn0RTEaMXHH-8Upvyw93K3uss0DWsw/exec'

  constructor(private http: HttpClient) { }

  getData() {
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${this.allData}?key=${this.apiKey}`;

    return this.http.get<any>(url);
  }

  getStringList() {
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${this.stringListRange}?key=${this.apiKey}`;
    return this.http.get(url);
  }

  getPaymentTypes() {
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${this.paymentTypesRange}?key=${this.apiKey}`;
    return this.http.get(url);
  }

  getExpenseData() {
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${this.expenseDataRange}?key=${this.apiKey}`;
    return this.http.get(url);
  }

  appendRow(values: any[]) {
    const directUrl = this.appendWebAppUrl;
    console.log('appendRow: Sending to', directUrl, { action: 'create', values });

    const nativeFetchPromise = fetch(directUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify({ action: 'create', values })
    })
      .then((response) => {
        console.log('appendRow: Response received', response);
        return 'Data dispatched!';
      })
      .catch((err) => {
        console.error('appendRow: Fetch error', err);
        throw err;
      });

    return from(nativeFetchPromise);
  }

  /**
   * Update an existing row in the sheet.
   * Sends the ID value (from column 14) to the backend.
   */
  updateRow(id: number, values: any[]) {
    const directUrl = this.appendWebAppUrl;
    console.log('updateRow: Sending to', directUrl, { action: 'update', id, values });

    const nativeFetchPromise = fetch(directUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify({ action: 'update', id, values })
    })
      .then((response) => {
        console.log('updateRow: Response received', response);
        return 'Update dispatched!';
      })
      .catch((err) => {
        console.error('updateRow: Fetch error', err);
        throw err;
      });

    return from(nativeFetchPromise);
  }

  updateStatus(rowNumber: number, status: string) {
    const directUrl = this.appendWebAppUrl;

    const nativeFetchPromise = fetch(directUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify({
        action: 'updateStatus',
        rowNumber,
        status
      })
    }).then(() => 'Status update dispatched!');

    return from(nativeFetchPromise);
  }

  consolidateData() {
    const revenueRequest = this.getData();
    const stringRequest = this.getStringList();
    const paymentRequest = this.getPaymentTypes();
    const expenseRequest = this.getExpenseData();

    forkJoin<{
      revenue: any;
      strings: any;
      payments: any;
      expenses: any;
    }>({
      revenue: revenueRequest,
      strings: stringRequest,
      payments: paymentRequest,
      expenses: expenseRequest,
    }).subscribe(({ revenue, strings, payments, expenses }) => {
      const values = (revenue as any)?.values || [];
      const stringValues = (strings as any)?.values || [];
      const paymentValues = (payments as any)?.values || [];
      const expenseValues = (expenses as any)?.values || [];

      const totalRevenue = Number(this.cleanCurrency(values[1]?.[10] ?? '0')) || 0;
      const actualRevenue = Number(this.cleanCurrency(values[1]?.[9] ?? '0')) || 0;
      const expenseTotal = Number(this.cleanCurrency(expenseValues[1]?.[5] ?? '0')) || 0;

      const dashboardInfo: dashboardData = {
        monthlyData: this.calculateMonthlyData(values),
        totalRevenue,
        actualRevenue,
        totalexpense: expenseTotal,
        netProfit: totalRevenue - expenseTotal,
        totalJobs: this.calcualteTotalJobs(values),
      };

      this.dashboardData$.next(dashboardInfo);
      this.historyData$.next(this.getHistoryData(values));
      this.stringList$.next(this.extractStringList({ values: stringValues }));
      this.paymentTypes$.next(this.extractPaymentTypes({ values: paymentValues }));
      this.expenseData$.next(this.getHistoryData(expenseValues));
    });
  }

  getHistoryData(data: any) {
    if (!Array.isArray(data)) {
      return [];
    }

    const out: any[] = [];
    for (let i = 2; i < data.length; i++) {
      const row = data[i];
      if ((row?.[1] ?? '').toString().trim() !== '') {
        out.push(Array.isArray(row) ? [...row] : [row]);
      }
    }
    return out.reverse();
  }

  calcualteTotalJobs(data: any) {
    let totalJobs = 0;
    for (let i = 1; i < data.length; i++) {
      if ((data[i][1] ?? '').toString().trim() !== '') {
        totalJobs++;
      }
    }
    return totalJobs;
  }

  calculateMonthlyData(data: any) {
    const totals = { totalRevenue: 0, serviceRevenue: 0 };
    for (let i = 2; i < data.length; i++) {
      const rawDate = data[i][8];
      if (!rawDate) continue;

      const date = new Date(rawDate);
      if (
        date.getMonth() === this.currentMonth &&
        date.getFullYear() === this.currentYear
      ) {
        const totalRaw = (data[i][5] ?? '').toString();
        const serviceRaw = (data[i][6] ?? '').toString();
        const totalVal = parseFloat(this.cleanCurrency(totalRaw)) || 0;
        const serviceVal = parseFloat(this.cleanCurrency(serviceRaw)) || 0;
        totals.totalRevenue += totalVal;
        totals.serviceRevenue += serviceVal;
      }
    }
    return totals;
  }

  private cleanCurrency(value: string): string {
    return value.toString().replace(/[$,]/g, '').trim();
  }

  extractStringList(response: any): string[] {
    return response.values.slice(2).map((row: any[]) => row[0]);
  }

  extractPaymentTypes(response: any): string[] {
    return response.values.slice(1).map((row: any[]) => row[0]);
  }
}