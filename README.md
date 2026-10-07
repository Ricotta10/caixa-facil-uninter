# 🧾 Caixa Fácil

**Controle de vendas, estoque, clientes e fiado para pequenos empreendedores: gratuito, simples e direto no celular.**

🔗 **Acesse:** <https://ricotta10.github.io/caixa-facil-uninter/>

Projeto desenvolvido para a disciplina **Atividade Extensionista II** do curso **CST em Análise e Desenvolvimento de Sistemas** do Centro Universitário Internacional **UNINTER**.

---

## 📌 O problema

Quem vende doces, salgados, cosméticos, roupas ou artesanato, ou presta pequenos serviços, costuma controlar vendas e fiado em cadernos ou de cabeça. O resultado é fiado esquecido, produto que acaba sem aviso e nenhuma noção de quanto se vende por dia ou por mês. As ferramentas de gestão do mercado geralmente são pagas, complexas ou exigem computador.

## 💡 A solução

O **Caixa Fácil** é uma aplicação web gratuita, que funciona no navegador do celular ou do computador, **sem instalação e sem criar conta**. Ela ajuda o pequeno empreendedor a organizar o negócio e promove a **inclusão digital** desse público.

### Objetivos de Desenvolvimento Sustentável (ONU)

| ODS | Como o projeto contribui |
|---|---|
| **8: Trabalho decente e crescimento econômico** | Dá ao pequeno empreendedor controle sobre vendas, estoque e fiado, apoiando a organização e o crescimento do negócio. |
| **10: Redução das desigualdades** | Oferece gratuitamente, com foco em acessibilidade, uma ferramenta de gestão a quem não tem acesso a sistemas pagos. |

## ✨ Funcionalidades

- **Painel:** vendido hoje e no mês, ticket médio, fiado a receber, produtos com estoque baixo e mais vendidos.
- **Vender:** carrinho com vários produtos, formas de pagamento (dinheiro, Pix, cartão e fiado) e cálculo de troco.
- **Produtos:** cadastro, edição, busca e exclusão, com aviso de estoque baixo e baixa automática a cada venda.
- **Clientes:** cadastro com WhatsApp, controle do fiado em aberto e registro de recebimento.
- **Histórico:** vendas por período, cancelamento com devolução ao estoque e exportação para planilha (CSV).
- **Acessos:** registro de cada acesso (nome, data, horário e aparelho), com envio opcional para uma planilha central do Google.
- **Ajuda:** guia de uso, cópia de segurança (backup), restauração, dados de exemplo e link para avaliação.

## ♿ Acessibilidade (7 princípios do Desenho Universal)

| Princípio | Como foi aplicado |
|---|---|
| 1. Uso igualitário | Gratuito, sem cadastro, funciona em qualquer celular ou computador com navegador. |
| 2. Uso flexível | Ajuste do tamanho do texto (A− / A+), tema claro/escuro automático e modo de alto contraste. |
| 3. Uso simples e intuitivo | Linguagem do dia a dia ("fiado", "troco", "repor") e um guia de 4 passos. |
| 4. Informação de fácil percepção | Rótulos em todos os campos, selos coloridos **com texto** (não depende só da cor) e avisos lidos por leitores de tela. |
| 5. Tolerância ao erro | Validação com mensagens claras, confirmação antes de excluir, cancelamento de vendas e backup. |
| 6. Baixo esforço físico | Poucos toques por venda, troco calculado automaticamente e estoque atualizado sozinho. |
| 7. Dimensão e espaço para uso | Botões e campos com área de toque grande (44–56 px) e layout pensado primeiro para o celular. |

Também segue recomendações da **WCAG 2.1**: navegação completa por teclado, foco visível, link "Pular para o conteúdo" e regiões `aria-live`.

## 🛠️ Tecnologias

- **HTML5, CSS3 e JavaScript** puros, sem frameworks nem bibliotecas.
- **localStorage** do navegador para guardar os dados no próprio aparelho.
- **Google Apps Script + Google Planilhas** para o registro central de acessos (opcional).
- **GitHub Pages** para a hospedagem gratuita com HTTPS.

## 📂 Estrutura do projeto

```
caixa-facil-uninter/
├── index.html              # Estrutura das telas
├── css/style.css           # Estilos (responsivo, temas e alto contraste)
├── js/
│   ├── config.js           # Endereço da planilha de acessos e do formulário de avaliação
│   ├── dados.js            # Regras de negócio e armazenamento
│   └── app.js              # Interface: telas, formulários e navegação
├── img/icone.svg           # Ícone do app
├── testes/dados.test.js    # Testes automatizados das regras de negócio
└── docs/
    ├── requisitos.md       # Requisitos funcionais, não funcionais e regras de negócio
    ├── diagramas.md        # Casos de uso, classes, sequência e processo (BPMN)
    ├── registro-de-acessos.md  # Como ligar o registro central na planilha do Google
    └── apps-script.gs      # Código do Google Apps Script
```

## ▶️ Como executar

**Online:** acesse <https://ricotta10.github.io/caixa-facil-uninter/>.

**No computador:**

```bash
git clone https://github.com/Ricotta10/caixa-facil-uninter.git
cd caixa-facil-uninter
python -m http.server 5500
```

Depois abra <http://localhost:5500> no navegador. Também é possível abrir o `index.html` direto, com dois cliques.

**Testes das regras de negócio** (requer [Node.js](https://nodejs.org/)):

```bash
node testes/dados.test.js
```

## 🔒 Privacidade (LGPD)

- Produtos, clientes e vendas ficam **somente no navegador do usuário**. Nada disso é enviado para servidores.
- Ao entrar, o usuário **consente** com o registro do seu **nome, tipo de negócio, data, horário e tipo de aparelho**, usados apenas como evidência acadêmica do projeto de extensão.

## 📄 Documentação

- [Requisitos](docs/requisitos.md)
- [Diagramas UML e BPMN](docs/diagramas.md)
- [Registro central de acessos](docs/registro-de-acessos.md)

## 👤 Autor

**Rodrigo Henrique da Costa Ricotta**: CST em Análise e Desenvolvimento de Sistemas, UNINTER.

## 📜 Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).
