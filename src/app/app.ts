import { Component, Inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { SheetService } from './services/sheet-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header],
  templateUrl: './app.html',
})
export class App implements OnInit {
  constructor(@Inject(SheetService) private sheetService: SheetService) {}

  ngOnInit(): void {
    this.sheetService.consolidateData();
  }
}
