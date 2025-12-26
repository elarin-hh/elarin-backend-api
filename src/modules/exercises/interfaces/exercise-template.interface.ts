export interface ExerciseTemplate {
  id: number;
  type: string;
  name: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  config?: Record<string, any>;
  editable_fields?: string[];
  created_at: string;
  updated_at: string;
}
