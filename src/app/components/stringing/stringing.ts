import { Component, Inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { SheetService } from '../../services/sheet-service';
import { AsyncPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-stringing',
  imports: [CommonModule, AsyncPipe, FormsModule],
  templateUrl: './stringing.html',
})
export class Stringing {
  stringList$ = new BehaviorSubject<any>([]);
  paymentTypes$ = new BehaviorSubject<any>([]);
  saving = false;
  form: any = {
    name: '',
    date: new Date().toISOString().slice(0, 10),
    racketModel: '',
    stringType: '',
    tension: '',
    servicePrice: '',
    discount: '',
    paymentMethod: ''
  };
  constructor(
    @Inject(SheetService) private sheetService: SheetService,
    @Inject(ActivatedRoute) private route: ActivatedRoute
  ) {
    this.sheetService.stringListSubject.subscribe((data) => {
      this.stringList$.next(data);
    });
    this.sheetService.paymentTypesSubject.subscribe((data) => {
      this.paymentTypes$.next(data);
    });

    this.route.queryParams.subscribe((params) => {
      if (Object.keys(params).length > 0) {
        this.form.name = params['name'] || this.form.name;
        this.form.racketModel = params['racketModel'] || this.form.racketModel;
        this.form.tension = params['tension'] || this.form.tension;
        this.form.stringType = params['stringType'] || this.form.stringType;
        this.form.paymentMethod = params['paymentMethod'] || this.form.paymentMethod;
        this.form.servicePrice = params['servicePrice'] || this.form.servicePrice;
        this.form.date = params['date'] || this.form.date;
      }
    });
  }

  saveJob() {
    this.normalizeTension();
    const total = parseFloat(this.form.servicePrice) || 0;
    const discount = parseFloat(this.form.discount) || 0;
    const revenue = Math.max(0, total - discount);

    const row = [
      'Income',
      this.form.name,
      this.form.racketModel,
      this.form.tension,
      this.form.stringType,
      `$${total}`,
      `$${revenue}`,
      this.form.paymentMethod,
      '',
      this.form.date
    ];

    console.log('Saving job row', row);

    try {
      this.saving = true;
      this.sheetService.appendRow(row).subscribe({
        next: () => {
          console.log('Job saved successfully');
          this.sheetService.consolidateData();
          this.resetForm();
          this.saving = false;
        },
        error: (err) => {
          console.error('Failed to save job', err);
          alert('Save failed: ' + (err?.message || 'Unknown error'));
          this.saving = false;
        }
      });
    } catch (error) {
      this.saving = false;
      console.error('Save job threw an error', error);
      alert('Save failed: ' + (error as Error).message);
    }
  }

  normalizeTension() {
    const raw = (this.form.tension ?? '').toString().trim();
    if (!raw) {
      return;
    }

    const normalized = raw.replace(/\s+/g, '').replace(/X/gi, 'x');
    if (/^\d+$/.test(normalized)) {
      this.form.tension = `${normalized}x${normalized}`;
      return;
    }

    if (/^\d+x\d+$/.test(normalized)) {
      this.form.tension = normalized;
      return;
    }

    this.form.tension = raw;
  }

  resetForm() {
    this.form = { name: '', date: new Date().toISOString().slice(0,10), racketModel: '', stringType: '', tension: '', servicePrice: '', discount: '', paymentMethod: '' };
  }

}
