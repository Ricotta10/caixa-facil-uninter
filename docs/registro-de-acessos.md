# Registro central de acessos (Google Planilhas)

O Caixa Fácil guarda os acessos no próprio aparelho (aba **Acessos** do app). Para reunir os acessos de **todas as pessoas** em um só lugar, o app pode enviar cada registro para uma planilha do Google, usando um Google Apps Script gratuito.

Cada linha da planilha contém: **data, horário, nome, tipo de negócio, evento** (primeiro acesso / acesso) e **aparelho**. Nenhum produto, cliente ou venda é enviado: esses dados nunca saem do aparelho.

## Passo a passo (cerca de 10 minutos)

1. Acesse <https://sheets.google.com> e crie uma planilha em branco chamada **Caixa Fácil — Acessos**.
2. Na planilha, abra o menu **Extensões → Apps Script**.
3. Apague o código que aparecer e cole todo o conteúdo do arquivo [`apps-script.gs`](apps-script.gs). Clique em **Salvar** (ícone de disquete).
4. Clique em **Implantar → Nova implantação**.
   - Em "Selecione o tipo" (ícone de engrenagem), escolha **App da Web**.
   - **Descrição:** `Caixa Fácil acessos`
   - **Executar como:** `Eu (seu e-mail)`
   - **Quem pode acessar:** `Qualquer pessoa`
5. Clique em **Implantar**, autorize com a sua conta Google. Se aparecer "O Google não verificou este app", clique em **Avançado → Acessar Caixa Fácil (não seguro)**. O script é seu, então é seguro.
6. Copie a **URL do app da Web** (termina em `/exec`).
7. No projeto, abra `js/config.js` e cole a URL entre as aspas de `LOG_ENDPOINT`:

   ```js
   LOG_ENDPOINT: 'https://script.google.com/macros/s/XXXXXXXX/exec',
   ```

8. Salve, faça o commit e envie para o GitHub. Em 1 ou 2 minutos o site publicado já estará usando a planilha.

## Como testar

- Abra a URL `/exec` no navegador: deve aparecer *"Caixa Fácil: registro de acessos ativo."*
- Entre no Caixa Fácil publicado com um nome qualquer. Em alguns segundos, uma linha nova aparece na aba **Acessos** da planilha.

## Observações

- Se alterar o código do script, use **Implantar → Gerenciar implantações → Editar (lápis) → Versão: Nova versão**. Assim a URL continua a mesma.
- A data e o horário gravados são os do servidor do Google, no fuso configurado na planilha (**Arquivo → Configurações → Fuso horário**). Deixe em `(GMT-03:00) Horário de Brasília`.
