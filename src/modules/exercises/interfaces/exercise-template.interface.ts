export interface ExerciseTemplate {
  id: number;
  type: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
