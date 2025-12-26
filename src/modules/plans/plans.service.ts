import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';

@Injectable()
export class PlansService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getAllActivePlans() {
    const { data, error } = await this.supabaseService.client
      .from('app_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_cents', { ascending: true });

    if (error) {
      throw new NotFoundException('Falha ao buscar planos');
    }

    return data || [];
  }
}
