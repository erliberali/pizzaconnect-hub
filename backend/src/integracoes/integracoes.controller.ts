import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { IntegracoesService, CriarCredencialDto } from './integracoes.service';

@Controller('integracoes')
export class IntegracoesController {
  constructor(private service: IntegracoesService) {}

  @Get('credenciais')
  listarCredenciais(@Query('pizzaria_id') pizzariaId?: string) {
    return this.service.listarCredenciais(pizzariaId);
  }

  @Post('credenciais')
  criarCredencial(@Body() dto: CriarCredencialDto) {
    return this.service.criarCredencial(dto);
  }

  @Post('reconciliar/:credencialId')
  reconciliar(@Param('credencialId') credencialId: string) {
    return this.service.reconciliar(credencialId);
  }

  @Get('eventos')
  listarEventos(
    @Query('pizzaria_id') pizzariaId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listarEventos(pizzariaId, limit ? parseInt(limit) : 50);
  }
}
