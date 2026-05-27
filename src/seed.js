import { db } from './firebase.js'
import { collection, addDoc, doc, setDoc } from 'firebase/firestore'

const questions = [
  {
    text: 'O que e compliance no ambiente corporativo?',
    category: 'Conceitos',
    options: [
      { text: 'Um software de gestao financeira', isCorrect: false },
      { text: 'O conjunto de praticas para garantir que a empresa atue em conformidade com leis e regulamentos', isCorrect: true },
      { text: 'Um departamento responsavel apenas por auditorias', isCorrect: false },
      { text: 'Uma certificacao obrigatoria para todas as empresas', isCorrect: false },
    ],
  },
  {
    text: 'Qual lei brasileira e conhecida como Lei Anticorrupcao?',
    category: 'Legislacao',
    options: [
      { text: 'Lei 12.846/2013', isCorrect: true },
      { text: 'Lei 8.666/1993', isCorrect: false },
      { text: 'Lei 13.709/2018', isCorrect: false },
      { text: 'Lei 9.613/1998', isCorrect: false },
    ],
  },
  {
    text: 'Um fornecedor oferece ingressos VIP para um show ao funcionario responsavel pela aprovacao de contratos. O que ele deve fazer?',
    category: 'Etica',
    options: [
      { text: 'Aceitar, pois e apenas um presente', isCorrect: false },
      { text: 'Aceitar e nao contar a ninguem', isCorrect: false },
      { text: 'Recusar e reportar ao canal de compliance', isCorrect: true },
      { text: 'Aceitar e retribuir com um presente de valor equivalente', isCorrect: false },
    ],
  },
  {
    text: 'O que e o Canal de Denuncias?',
    category: 'Conceitos',
    options: [
      { text: 'Um canal de TV corporativo', isCorrect: false },
      { text: 'Um meio seguro e confidencial para reportar irregularidades e condutas antiéticas', isCorrect: true },
      { text: 'Um grupo de WhatsApp da empresa', isCorrect: false },
      { text: 'Uma reuniao mensal de feedback', isCorrect: false },
    ],
  },
  {
    text: 'O que caracteriza um conflito de interesses?',
    category: 'Etica',
    options: [
      { text: 'Discordar do chefe em uma reuniao', isCorrect: false },
      { text: 'Quando interesses pessoais podem influenciar decisoes profissionais', isCorrect: true },
      { text: 'Trabalhar em mais de um projeto ao mesmo tempo', isCorrect: false },
      { text: 'Ter amigos no ambiente de trabalho', isCorrect: false },
    ],
  },
  {
    text: 'A LGPD (Lei Geral de Protecao de Dados) se aplica a quais tipos de dados?',
    category: 'LGPD',
    options: [
      { text: 'Apenas dados digitais', isCorrect: false },
      { text: 'Apenas dados de clientes', isCorrect: false },
      { text: 'Dados pessoais em qualquer meio, fisico ou digital', isCorrect: true },
      { text: 'Apenas dados financeiros', isCorrect: false },
    ],
  },
  {
    text: 'Um colega pede sua senha de acesso ao sistema para "adiantar um trabalho". O que voce deve fazer?',
    category: 'Seguranca',
    options: [
      { text: 'Compartilhar, pois e um colega de confianca', isCorrect: false },
      { text: 'Recusar e orientar que ele solicite seu proprio acesso', isCorrect: true },
      { text: 'Enviar por e-mail para ficar registrado', isCorrect: false },
      { text: 'Compartilhar apenas se for urgente', isCorrect: false },
    ],
  },
  {
    text: 'Qual e a principal finalidade de um Codigo de Conduta?',
    category: 'Conceitos',
    options: [
      { text: 'Punir funcionarios que cometem erros', isCorrect: false },
      { text: 'Estabelecer diretrizes eticas e comportamentais para todos na organizacao', isCorrect: true },
      { text: 'Substituir o contrato de trabalho', isCorrect: false },
      { text: 'Definir metas de vendas', isCorrect: false },
    ],
  },
  {
    text: 'Voce descobre que um colega esta fraudando relatorios de despesas. Qual a atitude correta?',
    category: 'Etica',
    options: [
      { text: 'Ignorar, pois nao e da sua conta', isCorrect: false },
      { text: 'Confrontar o colega publicamente', isCorrect: false },
      { text: 'Reportar pelo canal de denuncias de forma confidencial', isCorrect: true },
      { text: 'Pedir uma parte do valor', isCorrect: false },
    ],
  },
  {
    text: 'O que e lavagem de dinheiro?',
    category: 'Legislacao',
    options: [
      { text: 'Lavar notas sujas fisicamente', isCorrect: false },
      { text: 'Ocultar a origem ilicita de recursos financeiros para que parecam legitimos', isCorrect: true },
      { text: 'Transferir dinheiro entre contas bancarias', isCorrect: false },
      { text: 'Fazer investimentos no exterior', isCorrect: false },
    ],
  },
  {
    text: 'Qual destes e um exemplo de dado pessoal sensivel segundo a LGPD?',
    category: 'LGPD',
    options: [
      { text: 'Nome completo', isCorrect: false },
      { text: 'Endereco de e-mail', isCorrect: false },
      { text: 'Origem racial ou etnica', isCorrect: true },
      { text: 'Numero de telefone', isCorrect: false },
    ],
  },
  {
    text: 'Uma empresa pode ser responsabilizada por atos de corrupcao praticados por terceiros em seu nome?',
    category: 'Legislacao',
    options: [
      { text: 'Nao, apenas o terceiro responde', isCorrect: false },
      { text: 'Sim, a empresa pode ser responsabilizada objetivamente', isCorrect: true },
      { text: 'Somente se houver contrato formal', isCorrect: false },
      { text: 'Apenas se o CEO soubesse', isCorrect: false },
    ],
  },
  {
    text: 'Qual a melhor pratica ao receber um e-mail suspeito pedindo dados confidenciais?',
    category: 'Seguranca',
    options: [
      { text: 'Responder com os dados solicitados', isCorrect: false },
      { text: 'Encaminhar para todos os colegas como alerta', isCorrect: false },
      { text: 'Nao clicar em links, nao responder e reportar ao TI/Seguranca', isCorrect: true },
      { text: 'Deletar e esquecer', isCorrect: false },
    ],
  },
  {
    text: 'O que significa "due diligence" no contexto de compliance?',
    category: 'Conceitos',
    options: [
      { text: 'Fazer hora extra', isCorrect: false },
      { text: 'Investigacao previa sobre parceiros, fornecedores ou clientes para avaliar riscos', isCorrect: true },
      { text: 'Processo de demissao de funcionarios', isCorrect: false },
      { text: 'Auditoria contabil anual', isCorrect: false },
    ],
  },
  {
    text: 'Um funcionario publico pede uma "agilizacao" em troca de aprovar uma licenca mais rapido. Isso e:',
    category: 'Etica',
    options: [
      { text: 'Normal, faz parte do processo', isCorrect: false },
      { text: 'Corrupcao (suborno), e deve ser recusado e reportado', isCorrect: true },
      { text: 'Aceitavel se o valor for pequeno', isCorrect: false },
      { text: 'Permitido desde que nao haja testemunhas', isCorrect: false },
    ],
  },
  {
    text: 'Qual o prazo que a LGPD estabelece para a empresa comunicar incidentes de seguranca a ANPD?',
    category: 'LGPD',
    options: [
      { text: '24 horas', isCorrect: false },
      { text: 'Prazo razoavel, definido pela ANPD', isCorrect: true },
      { text: '30 dias uteis', isCorrect: false },
      { text: 'Nao ha prazo definido', isCorrect: false },
    ],
  },
]

async function seed() {
  console.log('Cadastrando perguntas...')

  for (const q of questions) {
    await addDoc(collection(db, 'questions'), q)
    console.log('+ ' + q.text.slice(0, 50) + '...')
  }

  await setDoc(doc(db, 'config', 'settings'), {
    totalRounds: 4,
    threshold: 80,
    secretCode: 'COMPL1ANC3',
    timePerQuestion: 30,
  })
  console.log('Config salva!')
  console.log(`Total: ${questions.length} perguntas cadastradas.`)
}

seed()
