# ShashBesh — regras v1

DRAFT_REVIEW_REQUIRED. Tradução para revisão, sem verificação independente por falantes nativos. Fonte: docs/RULES_V1.md e aprovação GAME UPDATE 06. As demais questões continuam abertas.

## Jogo e tabuleiro

De 2 a 4 jogadores, cinco peças para cada um. Vence quem primeiro preenche as cinco posições da sua casa em uma cadeia contígua. O percurso externo fechado tem 48 casas, 1→2→…→48→1; o movimento segue a numeração crescente. Inícios: P1=1, P2=13, P3=25, P4=37. Cada casa final inclui o início externo compartilhado e quatro posições internas: para P1, 1, Д1.2, Д1.3, Д1.4, Д1.5; igualmente para os demais. São 48 externas + 16 internas = 64 casas físicas únicas. Cantos: 7, 19, 31, 43. O CSV define a geometria exata.

## Início e turnos

Cada jogador lança um d6. O maior começa; em caso de empate, apenas os líderes empatados repetem até restar um. A ordem segue no sentido horário. Os demais esperam o jogador ativo concluir toda a série de lançamentos extras.

## Lançamentos e ações

Lance dois dados independentes de seis faces. Um resultado a–b dá ações separadas de a e b. A ordem e a distribuição entre peças respeitam a prioridade dos saltos legais de canto; capturar é opcional e depois qualquer peça pode usar legalmente os valores restantes. Qualquer dupla n–n dá quatro ações n e outro lançamento: 6–6 são quatro seis, não dois nem três. 6–5 ou 5–6 («shashbesh») dá ações seis e cinco e outro lançamento. Lançamentos extras são ilimitados. Resolva e registre cada lançamento antes do próximo; ações não podem ser misturadas nem transferidas entre lançamentos.

Use a maior soma possível dos valores entre sequências completas permitidas pelas prioridades de canto. Se puder usar 6+3=9, não é permitido mover seis de forma que impeça usar três. Se só puder usar um entre cinco e três, use cinco. Somas máximas iguais permitem livre escolha estratégica.

## Entrada, movimento e captura

Uma peça da reserva entra no seu início com uma ação de seis, sem avançar seis casas. Se houver peça própria no início, a entrada é proibida; uma adversária é capturada. No máximo uma peça por casa física. Não se pode passar, saltar ou cair sobre peças próprias; pode-se passar adversárias. Cair exatamente sobre uma adversária obriga a captura: ela volta à reserva e seu progresso é zerado. Escolher uma captura é opcional; outra ação legal pode ser escolhida. Não introduza pares, bloqueios, pilhas ou casas externas seguras não especificadas.

## Saltos de canto — prioridade confirmada pelo proprietário

Ciclo: 31→43→7→19→31. Um salto legal tem prioridade absoluta sobre captura, outra peça e ordem dos dados. Verifique sequências completas antes de escolher a estratégia. Chegar ao canto consome uma ação normal. O salto exige um um não usado e o consome como ação separada. Exemplo de 40 com 3–1: 40→41→42→43 consome três; 43→44→45→46→47→48→1→2→3→4→5→6→7 consome um. Esse um não pode ser gasto em outra ação; o salto não é gratuito.

Uma peça já no canto deve saltar se um um disponível permitir salto legal. Sem um, chegar ao canto não cria prioridade. O progresso externo aumenta pelos passos de aproximação e por doze no salto; os dados são gastos por seus valores nominais. Peças próprias bloqueiam tanto a aproximação quanto as doze casas do salto. Adversárias intermediárias ficam; apenas a do destino é capturada. Um salto bloqueado por peças próprias não cria obrigação; verificam-se então as ações normais pelas regras estabelecidas.

Preserve todas as alternativas de canto legais que cumpram as obrigações e a soma máxima. Uma captura não elimina outra alternativa de canto. Após o salto, escolha qualquer ação legal com os valores restantes, inclusive com outra peça. Com 1–2, salte primeiro com 1 e escolha depois a ação com 2; o 2 nunca é consumido automaticamente. Se nenhuma peça tiver ação legal, mantém-se a conclusão existente de lançamento sem jogadas. A política provisória `jumpEntry: skip` ao cruzar a entrada por salto permanece; dúvidas anteriores não ficam automaticamente resolvidas.

## Casa e vitória

Após completar a volta externa, a peça entra na própria casa ao chegar à entrada; não pode iniciar outra volta voluntariamente (saltos obrigatórios podem causar nova volta). As quatro posições internas são protegidas: adversárias não entram nem capturam ali. Várias peças próprias ainda móveis podem estar na casa, mas não podem passar umas pelas outras nem compartilhar posição. Com A em Д1.3, B pode entrar em Д1.2, sem saltar A.

É exigido o valor exato: não se ultrapassa a última posição nem o final. Um valor excessivo é ilegal para aquela peça, mas pode servir a outra. As peças ficam na casa e se tornam permanentemente fixas em cadeia a partir do fundo: Д1.5, Д1.4, Д1.3, Д1.2 e por último o início externo compartilhado (1, 13, 25 ou 37) após uma volta completa. Peças móveis podem entrar antes de as anteriores ficarem fixas. Preencher as cinco posições vence. Exemplo com 1–1, A em Д1.3 e B em Д1.2, sem salto obrigatório: A→Д1.4; B→Д1.3; A→Д1.5; B→Д1.4 é legal.

## Adiado / excluído

Dados que caem da mesa não são modelados. Escolher capturar é opcional; cair sobre uma adversária a captura automaticamente. Não se presumem apostas nem blockchain: a cadeia de hashes é um recurso técnico local.
