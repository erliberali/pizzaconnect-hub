import { Module } from '@nestjs/common';
import { CardapioWebModule } from './cardapioweb/cardapioweb.module';
import { SyncWorkerModule } from './sync-worker/sync-worker.module';
import { IntegracoesController } from './integracoes.controller';
import { IntegracoesService } from './integracoes.service';

@Module({
  imports: [CardapioWebModule, SyncWorkerModule],
  controllers: [IntegracoesController],
  providers: [IntegracoesService],
})
export class IntegracoesModule {}
