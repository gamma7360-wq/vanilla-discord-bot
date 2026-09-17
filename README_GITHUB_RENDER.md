# VANILLA — GitHub + Render

## GitHub
1. Crie um repositório no GitHub.
2. Envie todos os arquivos desta pasta.
3. **Não envie o `.env` nem o token do bot.**

## Render
1. Crie um Web Service/Background Worker a partir do repositório.
2. O `render.yaml` já define `npm install` e `npm start`.
3. No painel do Render, adicione as variáveis:
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID`
4. Faça o deploy.

## Discord
Depois que o bot estiver online:
1. Rode `npm run deploy` uma vez localmente para registrar os comandos.
2. No servidor, use `/setup-vanilla`.
3. Depois use `/ticket`.

O bot precisa das permissões necessárias para criar canais/cargos e gerenciar tickets. Nunca compartilhe o token.
