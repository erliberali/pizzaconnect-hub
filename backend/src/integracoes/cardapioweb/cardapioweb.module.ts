import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CardapioWebClient } from './cardapioweb.client';
import { CardapioWebImporterService } from './cardapioweb.importer.service';

@Module({
  imports: [HttpModule],
  providers: [CardapioWebClient, CardapioWebImporterService],
  exports: [CardapioWebClient, CardapioWebImporterService],
})
export class CardapioWebModule {}
