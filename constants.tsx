import { Column, Task, Client, Service } from './types';

export const DEFAULT_COLUMNS: Column[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'this-week', title: 'This Week' },
  { id: 'next-week', title: 'Next Week' },
  { id: 'in-review', title: 'In Review' },
  { id: 'complete', title: 'Complete' },
];

export const DEFAULT_SERVICES: Service[] = [
  { id: 's1', name: 'SEO', color: 'emerald', description: 'Search Engine Optimization and Keyword Strategy' },
  { id: 's2', name: 'Content', color: 'blue', description: 'Copywriting, blog posts and creative assets' },
  { id: 's3', name: 'Paid Ads', color: 'orange', description: 'PPC, Social Ads and Campaign Management' },
  { id: 's4', name: 'Social Media', color: 'purple', description: 'Organic social media management and engagement' },
  { id: 's5', name: 'Email', color: 'yellow', description: 'Newsletter campaigns and marketing automation' },
  { id: 's6', name: 'Analytics', color: 'teal', description: 'Reporting, conversion tracking and data analysis' },
  { id: 's7', name: 'Client Requests', color: 'rose', description: 'Ad-hoc support tickets and urgent feedback' },
];

export const SERVICE_COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  blue: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  orange: 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
  purple: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800',
  teal: 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
  rose: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  slate: 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
};

export const INITIAL_CLIENTS: Client[] = [
  { id: 'c1', name: 'ADR Architecture', email: 'rish@adr-architecture.com', color: '#3b82f6', password: '100001', industry: 'Architecture' },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Technical SEO Audit & CWV Analysis',
    description: 'Perform a deep dive into Core Web Vitals, crawl errors, and site architecture for the main marketing site.',
    category: 'SEO',
    priority: 'High',
    dueDate: '2025-03-15',
    columnId: 'this-week',
    clientId: 'c1',
    comments: []
  },
  {
    id: 't2',
    title: 'LinkedIn Lead Gen Campaign Setup',
    description: 'Design and launch the new sponsored content campaign targeting high-net-worth real estate developers.',
    category: 'Paid Ads',
    priority: 'Medium',
    dueDate: '2025-03-20',
    columnId: 'backlog',
    clientId: 'c1',
    comments: []
  },
  {
    id: 't3',
    title: 'Backlink Gap Analysis vs Competitors',
    description: 'Identify high-authority domains linking to competitors but not yet to our client for outreach strategy.',
    category: 'SEO',
    priority: 'Medium',
    dueDate: '2025-03-25',
    columnId: 'next-week',
    clientId: 'c1',
    comments: []
  },
  {
    id: 't4',
    title: 'Instagram Case Study Carousel',
    description: 'Draft the copy and select project images for the "Modern Minimalist" series for organic social.',
    category: 'Social Media',
    priority: 'Low',
    dueDate: '2025-03-10',
    columnId: 'complete',
    clientId: 'c1',
    comments: []
  }
];

export const PRIORITY_COLORS: Record<string, string> = {
  High: 'text-rose-500 dark:text-rose-400 font-bold',
  Medium: 'text-amber-500 dark:text-amber-400 font-bold',
  Low: 'text-slate-400 dark:text-slate-500 font-bold',
};