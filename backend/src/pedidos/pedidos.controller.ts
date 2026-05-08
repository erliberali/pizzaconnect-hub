import { Controller, Get, Param, Query } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { PedidoStatus, PedidoCanal } from '@prisma/client';

@Controller('pedidos')
export class PedidosController {
  constructor(private service: PedidosService) {}

  @Get()
  listar(
    @Query('pizzaria_id') pizzariaId?: string,
    @Query('status') status?: PedidoStatus,
    @Query('canal') canal?: PedidoCanal,
    @Query('desde') desde?: string,
    @Query('ate') ate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listar({
      pizzaria_id: pizzariaId,
      status,
      canal,
      desde,
      ate,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('kpis')
  kpis(
    @Query('pizzaria_id') pizzariaId?: string,
    @Query('data') data?: string,
  ) {
    return this.service.kpis(pizzariaId, data);
  }

  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.service.buscarPorId(id);
  }
}
