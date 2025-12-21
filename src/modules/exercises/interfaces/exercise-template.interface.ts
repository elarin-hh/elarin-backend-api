export interface ExerciseTemplate {
  id: number;
  type: string;
  name: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  fixed_config?: Record<string, any>;
  default_config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}
