import { Test } from '@nestjs/testing';
import { SyncWorkerService } from './sync-worker.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CardapioWebImporterService } from '../cardapioweb/cardapioweb.importer.service';

describe('SyncWorkerService', () => {
  let service: SyncWorkerService;
  let importer: jest.Mocked<CardapioWebImporterService>;
  let updateMock: jest.Mock;
  let rpcMock: jest.Mock;

  const makeSupabase = (job: any) => {
    // updateMock retorna { eq } onde eq retorna { lt, ...resolvido }
    // Necessário porque resetStuckJobs faz .update().eq().lt()
    // e processJob faz .update().eq()
    const ltMock = jest.fn().mockResolvedValue({ error: null, count: 0 });
    const eqMock = jest.fn().mockReturnValue({
      lt: ltMock,
      // também precisa ser thenable para o caso de processJob que faz await diretamente em .eq()
      then: (resolve: (v: any) => any) => Promise.resolve({ error: null }).then(resolve),
    });
    updateMock = jest.fn().mockReturnValue({ eq: eqMock });
    rpcMock = jest.fn().mockResolvedValue({ data: job, error: null });
    return {
      db: {
        rpc: rpcMock,
        from: jest.fn(() => ({ update: updateMock })),
      },
    } as any;
  };

  beforeEach(async () => {
    importer = { importarPeriodo: jest.fn() } as any;
  });

  it('marca completed ao terminar com sucesso', async () => {
    const job = { id: 'j-1', credencial_id: 'c-1', periodo_inicio: '2026-04-01', periodo_fim: '2026-04-10' };
    const supa = makeSupabase(job);
    const mod = await Test.createTestingModule({
      providers: [
        SyncWorkerService,
        { provide: SupabaseService, useValue: supa },
        { provide: CardapioWebImporterService, useValue: importer },
      ],
    }).compile();
    service = mod.get(SyncWorkerService);

    importer.importarPeriodo.mockResolvedValue({ importados: 5, atualizados: 2, erros: 0 });

    await service.tick();

    expect(importer.importarPeriodo).toHaveBeenCalledWith(
      'c-1',
      new Date('2026-04-01'),
      new Date('2026-04-10'),
      expect.any(Function),
    );
    const lastCall = updateMock.mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ status: 'completed', imported_count: 5, updated_count: 2, error_count: 0 });
  });

  it('marca failed quando importer lança', async () => {
    const job = { id: 'j-2', credencial_id: 'c-1', periodo_inicio: '2026-04-01', periodo_fim: '2026-04-10' };
    const supa = makeSupabase(job);
    const mod = await Test.createTestingModule({
      providers: [
        SyncWorkerService,
        { provide: SupabaseService, useValue: supa },
        { provide: CardapioWebImporterService, useValue: importer },
      ],
    }).compile();
    service = mod.get(SyncWorkerService);

    importer.importarPeriodo.mockRejectedValue(new Error('boom'));

    await service.tick();

    const lastCall = updateMock.mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ status: 'failed', error_message: expect.stringContaining('boom') });
  });

  it('não processa quando claim_sync_job retorna null', async () => {
    const supa = makeSupabase(null);
    const mod = await Test.createTestingModule({
      providers: [
        SyncWorkerService,
        { provide: SupabaseService, useValue: supa },
        { provide: CardapioWebImporterService, useValue: importer },
      ],
    }).compile();
    service = mod.get(SyncWorkerService);

    await service.tick();
    expect(importer.importarPeriodo).not.toHaveBeenCalled();
  });
});
