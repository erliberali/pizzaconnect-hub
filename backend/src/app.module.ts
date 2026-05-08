import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SupabaseModule } from './common/supabase/supabase.module';
import { IntegracoesModule } from './integracoes/integracoes.module';
import { PedidosModule } from './pedidos/pedidos.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    SupabaseModule,
    IntegracoesModule,
    PedidosModule,
  ],
})
export class AppModule {}
