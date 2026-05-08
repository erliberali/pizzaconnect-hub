import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: SupabaseClient<any>;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const url = this.config.getOrThrow<string>('SUPABASE_URL');
    // Service role bypassa RLS — usar apenas no backend, nunca expor ao cliente
    const key = this.config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get db(): SupabaseClient<any> {
    return this.client;
  }
}
