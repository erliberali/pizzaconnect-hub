import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Semeando banco de dados...');

  // Pizzarias reais
  const peche = await prisma.pizzaria.upsert({
    where: { id: 'pz-001' },
    update: {},
    create: {
      id: 'pz-001',
      nome: 'Peché Pizzaria',
      endereco: 'Rua das Flores, 123 - Centro',
      telefone: '(11) 3456-7890',
      status: 'ativa',
    },
  });

  const mozz = await prisma.pizzaria.upsert({
    where: { id: 'pz-002' },
    update: {},
    create: {
      id: 'pz-002',
      nome: 'Mozzarella Mais',
      endereco: 'Av. Brasil, 456 - Jardins',
      telefone: '(11) 3456-1234',
      status: 'ativa',
    },
  });

  console.log(`Pizzarias: ${peche.nome}, ${mozz.nome}`);

  // Mapeamento de status CardapioWeb → canônico
  const statusMaps = [
    { origem: 'cardapioweb', status_externo: 'PENDING', status_canonico: 'novo' },
    { origem: 'cardapioweb', status_externo: 'NEW', status_canonico: 'novo' },
    { origem: 'cardapioweb', status_externo: 'CONFIRMED', status_canonico: 'confirmado' },
    { origem: 'cardapioweb', status_externo: 'ACCEPTED', status_canonico: 'confirmado' },
    { origem: 'cardapioweb', status_externo: 'PREPARING', status_canonico: 'em_preparo' },
    { origem: 'cardapioweb', status_externo: 'IN_PREPARATION', status_canonico: 'em_preparo' },
    { origem: 'cardapioweb', status_externo: 'READY', status_canonico: 'pronto' },
    { origem: 'cardapioweb', status_externo: 'DONE', status_canonico: 'pronto' },
    { origem: 'cardapioweb', status_externo: 'OUT_FOR_DELIVERY', status_canonico: 'saiu_entrega' },
    { origem: 'cardapioweb', status_externo: 'DELIVERED', status_canonico: 'entregue' },
    { origem: 'cardapioweb', status_externo: 'CANCELLED', status_canonico: 'cancelado' },
    { origem: 'cardapioweb', status_externo: 'CANCELED', status_canonico: 'cancelado' },
  ];

  for (const sm of statusMaps) {
    await prisma.statusMap.upsert({
      where: { origem_status_externo: { origem: sm.origem, status_externo: sm.status_externo } },
      update: { status_canonico: sm.status_canonico },
      create: sm,
    });
  }

  console.log(`Status maps: ${statusMaps.length} registros`);

  // Credenciais — preencher com valores reais no .env ou diretamente aqui
  // ATENÇÃO: não commitar tokens reais
  const credPeche = await prisma.integracaoCredencial.upsert({
    where: {
      origem_estabelecimento_externo_id: {
        origem: 'cardapioweb',
        estabelecimento_externo_id: process.env.PECHE_ESTABELECIMENTO_ID || 'CW-PECHE-001',
      },
    },
    update: {},
    create: {
      pizzaria_id: peche.id,
      origem: 'cardapioweb',
      estabelecimento_externo_id: process.env.PECHE_ESTABELECIMENTO_ID || 'CW-PECHE-001',
      api_key_encrypted: process.env.PECHE_API_KEY || '',
      partner_key_encrypted: process.env.PECHE_PARTNER_KEY || '',
      ativo: true,
    },
  });

  const credMozz = await prisma.integracaoCredencial.upsert({
    where: {
      origem_estabelecimento_externo_id: {
        origem: 'cardapioweb',
        estabelecimento_externo_id: process.env.MOZZ_ESTABELECIMENTO_ID || 'CW-MOZZ-002',
      },
    },
    update: {},
    create: {
      pizzaria_id: mozz.id,
      origem: 'cardapioweb',
      estabelecimento_externo_id: process.env.MOZZ_ESTABELECIMENTO_ID || 'CW-MOZZ-002',
      api_key_encrypted: process.env.MOZZ_API_KEY || '',
      partner_key_encrypted: process.env.MOZZ_PARTNER_KEY || '',
      ativo: true,
    },
  });

  console.log(`Credenciais: ${credPeche.estabelecimento_externo_id}, ${credMozz.estabelecimento_externo_id}`);
  console.log('Seed concluído!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
