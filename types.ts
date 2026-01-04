
export type Priority = 'High' | 'Medium' | 'Low';

export interface Service {
  id: string;
  name: string;
  color: string; // Tailwind-like color identifier or hex
  description?: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  industry?: string;
  color: string;
  password?: string; // PIN code for custom portal access
  logo?: string; // Base64 or URL for the client logo
}

export interface TaskComment {
  id: string;
  author: string;
  role: 'admin' | 'client';
  text: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string; // References Service.name or id
  priority: Priority;
  dueDate?: string;
  columnId: string;
  clientId?: string;
  comments?: TaskComment[];
}

export interface Column {
  id: string;
  title: string;
}

export interface BoardData {
  tasks: Task[];
  columns: Column[];
  clients: Client[];
  services: Service[];
  globalLogo?: string;
  version: string;
}

export interface UserSession {
  isLoggedIn: boolean;
  username: string;
  lastLogin: string;
  role: 'admin' | 'client';
  clientId?: string;
}
