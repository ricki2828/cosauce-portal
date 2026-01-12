// Priorities module types

export interface PriorityUpdate {
  id: string;
  priority_id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export interface Priority {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  owner_name: string;
  status: 'active' | 'completed' | 'deferred';
  due_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  updates: PriorityUpdate[];
}

export interface PriorityCreate {
  title: string;
  description?: string;
  status?: 'active' | 'completed' | 'deferred';
  due_date?: string;
  sort_order?: number;
}

export interface PriorityUpdateCreate {
  content: string;
}
