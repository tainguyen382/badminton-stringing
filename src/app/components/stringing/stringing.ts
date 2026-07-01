import { Component, Inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
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
    @Inject(ActivatedRoute) private route: ActivatedRoute,
    @Inject(Router) private router: Router
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
    this.saving = true;

    if (this.isEditing && this.editRowIndex !== undefined && Number.isFinite(this.editRowIndex)) {
      // For edit, use existing ID
      const row = [
        this.editRowIndex,
        this.form.name,
        this.form.racketModel,
        this.form.tension,
        this.form.stringType,
        `$${total}`,
        `$${revenue}`,
        this.form.paymentMethod,
        this.form.date
      ];
      this.performSave(row, true, this.editRowIndex);
    } else {
      // For new row, fetch the next ID from sheet
      this.sheetService.getData().subscribe({
        next: (res: any) => {
          const nextId = this.getNextIdFromData(res.values);
          const row = [
            nextId,
            this.form.name,
            this.form.racketModel,
            this.form.tension,
            this.form.stringType,
            `$${total}`,
            `$${revenue}`,
            this.form.paymentMethod,
            this.form.date
          ];
          this.performSave(row, false);
        },
        error: (err) => {
          console.error('Failed to fetch sheet data for ID generation', err);
          alert('Failed to generate ID: ' + (err?.message || 'Unknown error'));
          this.saving = false;
        }
      });
    }
  }

  private performSave(row: any[], isUpdate: boolean, editId?: number) {
    console.log('Saving job row', row);
    console.log('Edit mode check:', { isEditing: this.isEditing, editRowIndex: this.editRowIndex });

    try {
      if (isUpdate && editId !== undefined) {
        console.log('Calling updateRow with id:', editId);
        this.sheetService.updateRow(editId, row).subscribe({
          next: () => {
            console.log('Job updated successfully');
            this.sheetService.consolidateData();
            this.resetForm();
            this.saving = false;
            this.router.navigate(['/history']);
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
            this.router.navigate(['/history']);
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

  private getNextIdFromData(data: any[]): number {
    let maxId = 0;
    for (let i = 2; i < data.length; i++) {
      const row = data[i];
      if (row && row.length > 0) {
        const id = parseInt(row[0], 10);
        if (!isNaN(id) && id > maxId) {
          maxId = id;
        }
      }
    }
    return maxId + 1;
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
