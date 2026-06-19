import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, from } from 'rxjs';
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
  appendWebAppUrl = 'https://script.google.com/macros/s/AKfycbyWqaKAorofDzEFvM8FxpYvV0bxEc698OmZin-0MoA2b23KqAQEA9O8uQMbq_H4QxAZ9w/exec'

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

  appendRow(values: any[]) {
    // Your exact Google Apps Script URL
    const directUrl = this.appendWebAppUrl;

    const nativeFetchPromise = fetch(directUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify({ values })
    }).then(() => 'Data dispatched!');

    return from(nativeFetchPromise);
  }

  consolidateData() {
    this.getData().subscribe((res: any) => {
      const values = res.values;
      let dashboardInfo: dashboardData = {
        monthlyData: this.calculateMonthlyData(values),
        totalRevenue: values[1][12],
        totalexpense: values[1][11],
        netProfit: values[1][13],
        totalJobs: this.calcualteTotalJobs(values),
      }
      this.dashboardData$.next(dashboardInfo);
      this.historyData$.next(this.getHistoryData(values));
      this.expenseData$.next(this.getExpenseData(values));
    });
    //get string
    this.getStringList().subscribe((res: any) => {
      const stringList = this.extractStringList(res);
      this.stringList$.next(stringList);
    });
    //get payment types
    this.getPaymentTypes().subscribe((res: any) => {
      const paymentTypes = this.extractPaymentTypes(res);
      this.paymentTypes$.next(paymentTypes);
    });
  }

  getExpenseData(data: any) {
    if (!Array.isArray(data)) {
      return [];
    }
    return data
      .slice(2)
      .filter((row: any) => (row?.[0] ?? '').toString().trim() === 'Expense' && (row?.[1] ?? '').toString().trim() !== '')
      .reverse();
  }

  getHistoryData(data: any) {
    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .slice(2)
      .filter((row: any) => (row?.[0] ?? '').toString().trim() === 'Income' && (row?.[1] ?? '').toString().trim() !== '')
      .reverse();
  }

  calcualteTotalJobs(data: any) {
    let totalJobs = 0;
    for (let i = 2; i < data.length; i++) {
      const type = data[i][0];
      if (type === 'Income' && (data[i][1] ?? '').toString().trim() !== '') {
        totalJobs++;
      }
    }
    return totalJobs;
  }

  calculateMonthlyData(data: any) {
    const totals = { totalRevenue: 0, serviceRevenue: 0 };
    for (let i = 2; i < data.length; i++) {

      const type = data[i][0];
      const rawDate = data[i][9];

      if (type !== 'Income' || !rawDate) continue;

      const date = new Date(rawDate);

      if (
        date.getMonth() === this.currentMonth &&
        date.getFullYear() === this.currentYear
      ) {
        const totalRaw = (data[i][5] ?? '').toString().replace(/\$/g, '').trim();
        const serviceRaw = (data[i][6] ?? '').toString().replace(/\$/g, '').trim();
        const totalVal = parseFloat(totalRaw) || 0;
        const serviceVal = parseFloat(serviceRaw) || 0;
        totals.totalRevenue += totalVal;
        totals.serviceRevenue += serviceVal;
      }
    }
    return totals;
  }

  extractStringList(response: any): string[] {
    return response.values.slice(2).map((row: any[]) => row[0]);
  }

  extractPaymentTypes(response: any): string[] {
    return response.values.slice(2).map((row: any[]) => row[0]);
  }
}