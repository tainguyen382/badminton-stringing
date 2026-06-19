import { Component, signal, Inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from "./components/header/header";
import { BehaviorSubject } from 'rxjs';
import { SheetService } from '../../src/app/services/sheet-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header],
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('badminton-stringing');
  constructor(@Inject(SheetService) private sheetService: SheetService) {
  }
  
  ngOnInit() {
    this.sheetService.consolidateData();
  }
}
