import { Component } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';

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
    }
  ]
  date = new Date();

  navigate(item: any) {
    this.menu.forEach((menuItem: any) => {
      menuItem.active = menuItem === item;
    });
    window.location.href = item.link;
  }

}

