import { Component } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [DatePipe, CommonModule],
  templateUrl: './header.html',
})
export class Header {
  menu: any = [
    {
      name: 'Dashboard',
      link: '/',
      active: true
    },
    {
      name: 'Stringing',
      link: '/stringing',
      active: false
    },
    {
      name: 'History',
      link: '/history',
      active: false
    },
    {
      name: 'Expenses',
      link: '/expenses',
      active: false
    },
    {
      name: 'Business History',
      link: '/bussiness-history',
      active: false
    },
  ]
  date = new Date();

  constructor(private router: Router) { }

  navigate(item: any) {
    this.menu.forEach((menuItem: any) => {
      menuItem.active = menuItem === item;
    });
    this.router.navigateByUrl(item.link);
  }

}

