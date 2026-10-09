# Requisitos do Caixa Fácil

## Contexto e problema

Muitos pequenos empreendedores e trabalhadores informais (quem vende doces, salgados, cosméticos, roupas, artesanato ou presta pequenos serviços) controlam vendas e fiado em cadernos ou de cabeça. Isso causa perda de dinheiro com fiado esquecido, falta de produto por não saber o estoque e falta de noção de quanto se vende por dia ou por mês. As ferramentas de gestão do mercado costumam ser pagas, complexas ou exigir cadastro e computador.

**Objetivo:** oferecer uma ferramenta **gratuita, simples, acessível e que funcione no celular** para registrar vendas, estoque, clientes e fiado, promovendo a **inclusão digital** desse público.

**ODS relacionados:** 8 (Trabalho decente e crescimento econômico) e 10 (Redução das desigualdades).

## Atores

| Ator | Descrição |
|---|---|
| Empreendedor(a) | Pessoa que usa o app para controlar o próprio negócio. |
| Planilha de acessos (Google) | Sistema externo que recebe o registro de cada acesso (nome, data e horário). |

## Requisitos funcionais (RF)

| ID | Requisito |
|---|---|
| RF01 | Permitir a entrada no sistema informando o nome e, opcionalmente, o tipo de negócio, com consentimento explícito para o registro de acesso. |
| RF02 | Registrar cada acesso com nome, data, horário, tipo de negócio, evento e tipo de aparelho, e exibir esse histórico na tela **Acessos**. |
| RF03 | Enviar cada registro de acesso para uma planilha central (Google Apps Script), quando configurada. |
| RF04 | Cadastrar, editar, buscar (sem diferenciar acentos) e excluir produtos (nome, preço de venda, quantidade em estoque e aviso de estoque mínimo opcional). |
| RF05 | Cadastrar, editar e excluir clientes (nome e telefone/WhatsApp opcional). |
| RF06 | Registrar vendas com um ou mais produtos, quantidade, cliente opcional e forma de pagamento (dinheiro, Pix, cartão ou fiado). |
| RF07 | Baixar automaticamente o estoque a cada venda e impedir a venda de quantidade maior que o estoque. |
| RF08 | Calcular o troco quando o pagamento for em dinheiro e impedir finalizar a venda se o valor recebido for menor que o total. |
| RF09 | Exigir cliente identificado em vendas fiado, mostrar o valor em aberto por cliente e permitir registrar o recebimento total ou parcial. |
| RF10 | Cancelar uma venda, devolvendo os produtos ao estoque. |
| RF11 | Exibir um painel com o total vendido no dia e no mês, ticket médio, fiado a receber, produtos com estoque baixo e os mais vendidos do mês. |
| RF12 | Listar o histórico de vendas filtrado por período e exportar para planilha (CSV). |
| RF13 | Exportar o registro de acessos para planilha (CSV). |
| RF14 | Gerar e restaurar uma cópia de segurança (backup) dos dados e permitir apagar todos os dados. |
| RF15 | Oferecer dados de exemplo para quem quer apenas experimentar. |
| RF16 | Disponibilizar um link para o formulário de avaliação (feedback). |
| RF17 | Aplicar desconto em reais na venda. |
| RF18 | Buscar produtos na tela de venda. |

## Requisitos não funcionais (RNF)

| ID | Categoria | Requisito |
|---|---|---|
| RNF01 | Portabilidade | Funcionar em qualquer navegador moderno, no celular e no computador, sem instalação. |
| RNF02 | Usabilidade | Layout responsivo, pensado primeiro para celular, com botões de no mínimo 44 px de altura e linguagem simples. |
| RNF03 | Acessibilidade | Seguir as recomendações da WCAG 2.1: rótulos em todos os campos, navegação por teclado, foco visível, avisos lidos por leitores de tela (`aria-live`), ajuste do tamanho do texto, modo de alto contraste e tema escuro automático. |
| RNF04 | Privacidade (LGPD) | Produtos, clientes e vendas ficam somente no navegador do usuário (localStorage). Apenas nome, tipo de negócio, data, horário e tipo de aparelho são enviados ao registro de acessos, com consentimento. |
| RNF05 | Segurança | Todo texto digitado é tratado antes de ser exibido, para evitar injeção de código (XSS). No script da planilha, textos que começam com `=`, `+`, `-` ou `@` são neutralizados para evitar injeção de fórmulas. |
| RNF06 | Confiabilidade | Valores monetários armazenados em centavos (inteiros) para evitar erros de arredondamento. Uma venda só altera o estoque depois que todos os itens forem validados. |
| RNF07 | Desempenho | Carregamento rápido: HTML, CSS e JavaScript puros, sem bibliotecas externas. |
| RNF08 | Disponibilidade | Hospedagem gratuita no GitHub Pages, com HTTPS. |
| RNF09 | Manutenibilidade | Separação entre regras de negócio (`js/dados.js`) e interface (`js/app.js`), com testes automatizados das regras de negócio (`testes/dados.test.js`). |

## Regras de negócio (RN)

| ID | Regra |
|---|---|
| RN01 | Não é permitido cadastrar dois produtos (ou dois clientes) com o mesmo nome. |
| RN02 | O preço de venda deve ser maior que zero; estoque e estoque mínimo são inteiros maiores ou iguais a zero. |
| RN03 | Uma venda fiado exige um cliente cadastrado. |
| RN04 | Um cliente com fiado em aberto não pode ser excluído. |
| RN05 | Vendas canceladas não entram nos totais e devolvem os produtos ao estoque. |
| RN06 | Ao excluir um produto, as vendas antigas mantêm o nome e o preço praticados na época. |
| RN07 | Um produto aparece como "estoque baixo" quando a quantidade é menor ou igual ao estoque mínimo informado. Se o aviso ficar em branco (por exemplo, peças únicas de bazar), o produto não gera alerta. |
| RN08 | O desconto deve ser menor que o valor da venda. |
| RN09 | Pagamentos parciais de fiado abatem primeiro as vendas mais antigas; a venda passa a "paga" quando o saldo zera. |

## Histórico de versões

| Versão | Data | Mudanças |
|---|---|---|
| 1.0 | 07/10/2026 | Primeira versão publicada. |
| 1.1 | 09/10/2026 | Melhorias pedidas pelas participantes na avaliação: busca sem acentos (RF04), bloqueio de venda em dinheiro com valor recebido menor que o total (RF08), pagamento parcial de fiado (RF09/RN09), desconto na venda (RF17), busca na tela de venda (RF18) e aviso de estoque opcional para peças únicas (RN07). |

**Trabalho futuro:** sincronizar os dados entre aparelhos (pedido de uma participante). Exigiria cadastro com login e armazenamento em servidor, o que muda a decisão atual de manter os dados apenas no aparelho, por privacidade (RNF04).
