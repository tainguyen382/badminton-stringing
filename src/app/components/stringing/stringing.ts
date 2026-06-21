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
  isEditing = false;
  editRowIndex: number | undefined;
  form: any = {
    name: '',
    date: this.getLocalDateString(),
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
        console.log('Stringing form received params:', params);
        this.form.name = params['name'] || this.form.name;
        this.form.racketModel = params['racketModel'] || this.form.racketModel;
        this.form.tension = params['tension'] || this.form.tension;
        this.form.stringType = params['stringType'] || this.form.stringType;
        this.form.paymentMethod = params['paymentMethod'] || this.form.paymentMethod;
        this.form.servicePrice = params['servicePrice'] || this.form.servicePrice;
        const incomingDate = params['date'] || this.form.date;
        this.form.date = this.convertDateFormat(incomingDate);
        this.isEditing = params['edit'] === 'true' || params['edit'] === true;
        this.editRowIndex = params['rowId'] ? Number(params['rowId']) : undefined;
        console.log('After param processing:', { isEditing: this.isEditing, editRowIndex: this.editRowIndex });
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
    console.log('Edit mode check:', { isEditing: this.isEditing, editRowIndex: this.editRowIndex });

    try {
      this.saving = true;
      if (this.isEditing && this.editRowIndex) {
        console.log('Calling updateRow with id:', this.editRowIndex);
        this.sheetService.updateRow(this.editRowIndex, row).subscribe({
          next: () => {
            console.log('Job updated successfully');
            this.sheetService.consolidateData();
            this.resetForm();
            this.saving = false;
          },
          error: (err) => {
            console.error('Failed to update job', err);
            alert('Update failed: ' + (err?.message || 'Unknown error'));
            this.saving = false;
          }
        });
      } else {
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
      }
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
    this.form = {
      name: '',
      date: this.getLocalDateString(),
      racketModel: '',
      stringType: '',
      tension: '',
      servicePrice: '',
      discount: '',
      paymentMethod: ''
    };
    this.isEditing = false;
    this.editRowIndex = undefined;
  }

  private getLocalDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private convertDateFormat(dateStr: string): string {
    // Convert from M/D/YYYY or MM/DD/YYYY to yyyy-MM-dd
    if (!dateStr) return this.getLocalDateString();
    
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr; // Already in correct format or invalid
    
    const month = String(parts[0]).padStart(2, '0');
    const day = String(parts[1]).padStart(2, '0');
    const year = parts[2];
    
    return `${year}-${month}-${day}`;
  }
}
