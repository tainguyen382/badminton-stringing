import { Component, EventEmitter, Output } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [DatePipe, CommonModule],
  templateUrl: './header.html',
})
export class Header {
  @Output() lockRequested = new EventEmitter<void>();

  menu: any = [
    {
      name: 'Dashboard',
      link: '/',
      icon: 'dashboard',
      active: true
    },
    {
      name: 'Stringing',
      link: '/stringing',
      icon: 'build',
      active: false
    },
    {
      name: 'History',
      link: '/history',
      icon: 'history',
      active: false
    },
    {
      name: 'Customers',
      link: '/customer-insights',
      icon: 'people',
      active: false
    },
    // {
    //   name: 'Expenses',
    //   link: '/expenses',
    //   active: false
    // },
    {
      name: 'Monthly',
      link: '/bussiness-history',
      icon: 'date_range',
      active: false
    },
  ]
  date = new Date();

  constructor(private router: Router) {
    this.syncActiveItem();
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.syncActiveItem());
  }

  navigate(item: any) {
    this.router.navigateByUrl(item.link);
  }

  private syncActiveItem(): void {
    const currentPath = this.router.url.split(/[?#]/)[0];
    this.menu.forEach((item: any) => {
      item.active = item.link === currentPath;
    });
  }

}

