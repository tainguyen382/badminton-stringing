import { Routes } from '@angular/router';
import { Dashboard } from './components/dashboard/dashboard';
import { Stringing } from './components/stringing/stringing';
import { History } from './components/history/history';
import { Expense } from './components/expense/expense';

export const routes: Routes = [
  {
    path: '',
    component: Dashboard
  },
  {
    path: 'stringing',
    component: Stringing
  },
  {
    path: 'history',
    component: History                        
  },
  {
    path: 'expenses',
    component: Expense
  }
];