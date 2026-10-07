/*
 * Configurações do Caixa Fácil.
 *
 * LOG_ENDPOINT: endereço do Google Apps Script que grava cada acesso
 *   (nome, data e horário) em uma planilha do Google. Passo a passo em
 *   docs/registro-de-acessos.md. Vazio = o registro fica só no aparelho.
 *
 * FEEDBACK_URL: link do formulário de avaliação (Google Forms).
 *   Vazio = o botão "Avaliar o app" não aparece.
 */
const CONFIG = {
  LOG_ENDPOINT: '',
  FEEDBACK_URL: ''
};
