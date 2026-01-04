
import { Column, Task, Client, Service } from './types';

export const DEFAULT_COLUMNS: Column[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'this-week', title: 'This Week' },
  { id: 'next-week', title: 'Next Week' },
  { id: 'in-review', title: 'In Review' },
  { id: 'complete', title: 'Complete' },
];

export const DEFAULT_SERVICES: Service[] = [
  { id: 's1', name: 'SEO', color: 'emerald', description: 'Search Engine Optimization' },
  { id: 's2', name: 'Content', color: 'blue', description: 'Copywriting and blog posts' },
  { id: 's3', name: 'Paid Ads', color: 'orange', description: 'PPC and social advertising' },
  { id: 's4', name: 'Social Media', color: 'purple', description: 'Organic social management' },
  { id: 's5', name: 'Email', color: 'yellow', description: 'Campaigns and automation' },
  { id: 's6', name: 'Analytics', color: 'teal', description: 'Reporting and tracking' },
  { id: 's7', name: 'Client Requests', color: 'rose', description: 'Ad-hoc support tickets' },
];

export const SERVICE_COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  blue: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  orange: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
  purple: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800',
  teal: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
  rose: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  slate: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
};

export const INITIAL_CLIENTS: Client[] = [
  { id: 'c1', name: 'ADR Architecture', email: 'rish@adr-architecture.com', color: '#3b82f6', password: '100001', industry: 'Architecture' },
];

export const INITIAL_TASKS: Task[] = [];

export const PRIORITY_COLORS: Record<string, string> = {
  High: 'text-rose-600 dark:text-rose-400 font-semibold',
  Medium: 'text-amber-600 dark:text-amber-400 font-semibold',
  Low: 'text-slate-500 dark:text-slate-400 font-medium',
};
