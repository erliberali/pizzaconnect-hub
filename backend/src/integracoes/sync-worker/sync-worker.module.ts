// backend/src/integracoes/sync-worker/sync-worker.module.ts
import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../common/supabase/supabase.module';
import { CardapioWebModule } from '../cardapioweb/cardapioweb.module';
import { SyncWorkerService } from './sync-worker.service';

@Module({
  imports: [SupabaseModule, CardapioWebModule],
  providers: [SyncWorkerService],
})
export class SyncWorkerModule {}
