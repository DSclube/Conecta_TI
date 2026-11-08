// Edição de exemplo, usada quando o Supabase não está configurado
export const DEMO = [{
  id: 'demo', numero: 2, ano: 1, publicada_em: '2026-03-01', curtidas: 0,
  conteudo: {
    principal: {
      titulo: 'Tecnologia que Transforma: projeto comunitário forma programadores web no Bairro da Paz',
      resumo: 'O SENAI CIMATEC mantém, no Instituto Avançar, um curso gratuito de Programador Web de 240 horas.',
      texto: 'A iniciativa fortalece parcerias locais e amplia o acesso à educação técnica para a comunidade.\n\nOs alunos aprendem lógica de programação, estruturação de páginas web e estilização, além de disciplina, organização e postura profissional.\n\nAs aulas foram iniciadas pelo professor Matheus Edinei e hoje são conduzidas pelo instrutor Gabriel Cunha.'
    },
    secundarias: [
      { titulo: 'Parabéns, professor Jailton Rodrigues!', texto: 'Referência no curso de Redes de Computadores, com mais de 15 anos de SENAI, Jailton é SAEP Top One e celebrou aniversário em 18 de fevereiro.' },
      { titulo: 'Vem aí… Clube de Programação', texto: 'Idealizado pelos professores Celso Barreto e Anildo Matos, o clube vai reunir desafios e projetos além da sala de aula.' }
    ],
    eventos: [
      { titulo: 'Inscrições do Pós-Técnico', data: '2026-03-02', local: 'www.postecnico.senaibahia.com.br' },
      { titulo: 'Encerramento das inscrições', data: '2026-05-03', local: 'Online' }
    ],
    tecnologia: [
      { titulo: 'Pós-Técnico em Cibersegurança', texto: 'Formação a distância alinhada às demandas da Indústria 4.0.' },
      { titulo: 'Especialização em Inteligência Artificial', texto: 'Para quem já concluiu um curso técnico e quer avançar na carreira.' },
      { titulo: 'Você sabia?', texto: 'O primeiro vírus de computador surgiu em 1986 e se chamava “Brain”.' }
    ],
    datas: [
      { data: '2026-03-02', titulo: 'Abertura das inscrições do Pós-Técnico' },
      { data: '2026-05-03', titulo: 'Último dia de inscrição' }
    ],
    extras: [
      { secao: 'Sugestão de pauta', titulo: 'Participe do jornal', texto: 'Sugestões de pauta podem ser encaminhadas à Coordenação Editorial. Jornal elaborado pela Coordenação dos Cursos Técnicos em Tecnologia da Informação do SENAI CIMATEC.' }
    ]
  }
}]
