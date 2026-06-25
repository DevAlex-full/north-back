import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

declare const process: {
  env: {
    SEED_USER_EMAIL?: string
    SEED_USER_PASSWORD?: string
  }
}

const prisma = new PrismaClient()

const seedEmail = process.env.SEED_USER_EMAIL ?? 'alex@north.app'
const seedPassword = process.env.SEED_USER_PASSWORD ?? 'north2024'

async function main() {
  console.log('🌱 Iniciando seed do North...')

  // Limpa dados existentes
  await prisma.projectTask.deleteMany()
  await prisma.project.deleteMany()
  await prisma.goal.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.workanaProposal.deleteMany()
  await prisma.jobApplication.deleteMany()
  await prisma.contentPlan.deleteMany()
  await prisma.financialTransaction.deleteMany()
  await prisma.financialCategory.deleteMany()
  await prisma.dailyGoal.deleteMany()
  await prisma.task.deleteMany()
  await prisma.scheduleBlock.deleteMany()
  await prisma.routine.deleteMany()
  await prisma.notificationSetting.deleteMany()
  await prisma.userSettings.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.user.deleteMany()

  // Cria usuário principal
  const hashedPassword = await bcrypt.hash(seedPassword, 10)
  const user = await prisma.user.create({
    data: {
      name: 'Alex',
      email: seedEmail,
      password: hashedPassword,
      settings: {
        create: {
          dailyGoalAmount: 150,
          weeklyGoal: 900,
          monthlyGoal: 3600,
          theme: 'dark',
        },
      },
      notificationSettings: {
        create: {
          enabled: true,
          morningEnabled: true,
          morningTime: '09:00',
          prospectEnabled: true,
          prospectTime: '13:00',
          indriveEnabled: true,
          indriveTime: '15:00',
          closingEnabled: true,
          closingTime: '21:00',
        },
      },
    },
  })

  console.log(`✅ Usuário criado: ${user.email}`)

  // ── Categorias Financeiras ──────────────────────────────────────────
  const incomeCategories = [
    { name: 'Indrive', type: 'INCOME', color: '#10B981', icon: 'car' },
    { name: 'Freelance', type: 'INCOME', color: '#3B82F6', icon: 'briefcase' },
    { name: 'Outros', type: 'INCOME', color: '#8B5CF6', icon: 'plus' },
  ]

  const expenseCategories = [
    { name: 'Gasolina', type: 'EXPENSE', color: '#EF4444', icon: 'fuel' },
    { name: 'Erva', type: 'EXPENSE', color: '#6B7280', icon: 'leaf' },
    { name: 'Alimentação', type: 'EXPENSE', color: '#F59E0B', icon: 'utensils' },
    { name: 'Manutenção Carro', type: 'EXPENSE', color: '#EC4899', icon: 'wrench' },
    { name: 'Ferramentas', type: 'EXPENSE', color: '#06B6D4', icon: 'tool' },
    { name: 'Assinaturas', type: 'EXPENSE', color: '#F97316', icon: 'credit-card' },
    { name: 'Outros', type: 'EXPENSE', color: '#9CA3AF', icon: 'more-horizontal' },
  ]

  for (const cat of [...incomeCategories, ...expenseCategories]) {
    await prisma.financialCategory.create({ data: { ...cat, userId: user.id } })
  }

  console.log('✅ Categorias financeiras criadas')

  // ── Rotina Semanal ─────────────────────────────────────────────────
  // Segunda a Sexta [1,2,3,4,5]
  const weekdays = [1, 2, 3, 4, 5]
  const weekdayBlocks = [
    {
      title: 'Planejamento do Dia',
      description: 'Ver metas, responder mensagens, organizar tarefas',
      startTime: '08:00',
      endTime: '09:00',
      category: 'planejamento',
      dayOfWeek: weekdays,
    },
    {
      title: 'Programação',
      description: 'P1: Projeto cliente | P2: Portfólio | P3: BarberFlow | P4: LocaMed',
      startTime: '09:00',
      endTime: '12:00',
      category: 'programacao',
      dayOfWeek: weekdays,
    },
    {
      title: 'Almoço',
      description: 'Pausa para almoço',
      startTime: '12:00',
      endTime: '13:00',
      category: 'pessoal',
      dayOfWeek: weekdays,
    },
    {
      title: 'Prospecção e Busca de Renda',
      description: 'Workana, LinkedIn, Facebook, WhatsApp, Instagram — Meta: 10 contatos/dia',
      startTime: '13:00',
      endTime: '15:00',
      category: 'prospeccao',
      dayOfWeek: weekdays,
    },
    {
      title: 'Indrive',
      description: 'Meta diária de lucro líquido: R$ 150',
      startTime: '15:00',
      endTime: '22:00',
      category: 'indrive',
      dayOfWeek: weekdays,
    },
  ]

  for (const block of weekdayBlocks) {
    await prisma.scheduleBlock.create({ data: { ...block, userId: user.id } })
  }

  // Sábado [6]
  const saturdayBlocks = [
    {
      title: 'Programação e Portfólio',
      description: 'Melhorar portfólio, ajustar projetos',
      startTime: '08:00',
      endTime: '12:00',
      category: 'programacao',
      dayOfWeek: [6],
    },
    {
      title: 'Marketing e Conteúdo',
      description: 'Instagram, LinkedIn, Workana, produção de conteúdo',
      startTime: '13:00',
      endTime: '18:00',
      category: 'marketing',
      dayOfWeek: [6],
    },
    {
      title: 'Indrive (complementar)',
      description: 'Somente se precisar complementar a meta semanal',
      startTime: '18:00',
      endTime: '22:00',
      category: 'indrive',
      dayOfWeek: [6],
    },
  ]

  for (const block of saturdayBlocks) {
    await prisma.scheduleBlock.create({ data: { ...block, userId: user.id } })
  }

  // Domingo [0]
  const sundayBlocks = [
    {
      title: 'Revisão Financeira e Planejamento da Semana',
      description: 'Analisar semana, planejar próxima',
      startTime: '08:00',
      endTime: '12:00',
      category: 'planejamento',
      dayOfWeek: [0],
    },
    {
      title: 'Descanso',
      description: 'Tarde reservada para descanso',
      startTime: '13:00',
      endTime: '22:00',
      category: 'pessoal',
      dayOfWeek: [0],
    },
  ]

  for (const block of sundayBlocks) {
    await prisma.scheduleBlock.create({ data: { ...block, userId: user.id } })
  }

  console.log('✅ Rotina semanal criada')

  // ── Tarefas de hoje ────────────────────────────────────────────────
  const today = new Date()
  today.setHours(12, 0, 0, 0)

  const todayTasks = [
    { title: 'Planejamento do dia', status: 'PENDING', priority: 1 },
    { title: 'Ver metas', status: 'PENDING', priority: 1 },
    { title: 'Responder mensagens', status: 'PENDING', priority: 2 },
    { title: 'Organizar tarefas', status: 'PENDING', priority: 2 },
    { title: 'Programação', status: 'PENDING', priority: 1 },
    { title: 'Prospecção — 10 contatos', status: 'PENDING', priority: 1 },
    { title: 'Conteúdo LinkedIn', status: 'PENDING', priority: 3 },
    { title: 'Indrive — Meta R$ 150', status: 'PENDING', priority: 1 },
  ]

  for (const task of todayTasks) {
    await prisma.task.create({ data: { ...task, userId: user.id, date: today } })
  }

  console.log('✅ Tarefas de hoje criadas')

  // ── Projetos ───────────────────────────────────────────────────────
  const projects = [
    {
      name: 'BarberFlow',
      description: 'Sistema de agendamento para barbearias',
      status: 'IN_PROGRESS',
      priority: 3,
      tasks: [
        { title: 'Estrutura do banco de dados', status: 'DONE', priority: 1 },
        { title: 'API de agendamento', status: 'IN_PROGRESS', priority: 1 },
        { title: 'Dashboard do barbeiro', status: 'PENDING', priority: 2 },
        { title: 'App do cliente', status: 'PENDING', priority: 2 },
      ],
    },
    {
      name: 'LocaMed',
      description: 'Sistema de locação de equipamentos médicos',
      status: 'IN_PROGRESS',
      priority: 4,
      tasks: [
        { title: 'Levantamento de requisitos', status: 'DONE', priority: 1 },
        { title: 'Prototipação das telas', status: 'PENDING', priority: 1 },
        { title: 'Backend inicial', status: 'PENDING', priority: 2 },
      ],
    },
    {
      name: 'Portfólio',
      description: 'Site portfólio pessoal para captação de clientes',
      status: 'IN_PROGRESS',
      priority: 2,
      tasks: [
        { title: 'Layout e design', status: 'IN_PROGRESS', priority: 1 },
        { title: 'Seção de projetos', status: 'PENDING', priority: 1 },
        { title: 'Deploy e domínio', status: 'PENDING', priority: 2 },
      ],
    },
    {
      name: 'North',
      description: 'Sistema pessoal de organização de rotina e finanças',
      status: 'IN_PROGRESS',
      priority: 1,
      tasks: [
        { title: 'Backend API', status: 'IN_PROGRESS', priority: 1 },
        { title: 'App React Native', status: 'PENDING', priority: 1 },
        { title: 'Deploy no Render', status: 'PENDING', priority: 2 },
      ],
    },
  ]

  for (const proj of projects) {
    const { tasks, ...projData } = proj
    const created = await prisma.project.create({ data: { ...projData, userId: user.id } })
    for (const task of tasks) {
      await prisma.projectTask.create({
        data: {
          ...task,
          projectId: created.id,
          completedAt: task.status === 'DONE' ? new Date() : undefined,
        },
      })
    }
  }

  console.log('✅ Projetos criados')

  // ── Metas 90 dias ──────────────────────────────────────────────────
  const goals = [
    {
      title: 'Primeiro cliente pago',
      description: 'Fechar o primeiro cliente de desenvolvimento freelance',
      type: 'COUNTER',
      target: 1,
      current: 0,
      unit: 'cliente',
      status: 'ACTIVE',
    },
    {
      title: '20 propostas enviadas',
      description: 'Enviar 20 propostas no Workana e outros canais',
      type: 'COUNTER',
      target: 20,
      current: 0,
      unit: 'proposta',
      status: 'ACTIVE',
    },
    {
      title: '100 contatos realizados',
      description: 'Prospectar 100 potenciais clientes',
      type: 'COUNTER',
      target: 100,
      current: 0,
      unit: 'contato',
      status: 'ACTIVE',
    },
    {
      title: 'Receita mensal R$ 2.000',
      description: 'Atingir renda mensal de R$ 2.000',
      type: 'FINANCIAL',
      target: 2000,
      current: 0,
      unit: 'R$',
      status: 'ACTIVE',
    },
    {
      title: 'Receita mensal R$ 4.000',
      description: 'Atingir renda mensal de R$ 4.000',
      type: 'FINANCIAL',
      target: 4000,
      current: 0,
      unit: 'R$',
      status: 'ACTIVE',
    },
  ]

  for (const goal of goals) {
    await prisma.goal.create({ data: { ...goal, userId: user.id } })
  }

  console.log('✅ Metas 90 dias criadas')

  // ── Meta Indrive de hoje ───────────────────────────────────────────
  const todayGoalDate = new Date(); todayGoalDate.setHours(0, 0, 0, 0)
  await prisma.dailyGoal.create({
    data: {
      userId: user.id,
      date: todayGoalDate,
      targetAmount: 150,
      earnedAmount: 0,
      gasAmount: 0,
      status: 'BELOW',
    },
  })

  console.log('✅ Meta diária criada')

  console.log('\n🎉 Seed concluído com sucesso!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📧 Email:    ${seedEmail}`)
  console.log('🔑 Senha:    definida via SEED_USER_PASSWORD')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
      ; (globalThis as any).process?.exit(1)
  })
  .finally(async () => { await prisma.$disconnect() })
