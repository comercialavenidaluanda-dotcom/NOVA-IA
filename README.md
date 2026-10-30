# NOVA AI STUDIO

Plataforma web e desktop para criação multimédia assistida por IA e desenvolvimento por prompts.

## Estado
Fundação inicial em construção. Esta versão inclui a interface do estúdio, um editor de vídeo de primeira etapa, a área NOVA AI DEVELOPER e uma API de chat com adaptadores para OpenAI, Google Gemini e Anthropic.

**Não estão ainda disponíveis como funcionalidades de produção:** geração real de vídeo, geração de imagem, avatares/lip-sync, TTS, música, exportação profissional acelerada por GPU ou projetos colaborativos.

## Requisitos
- Node.js 20+
- npm 10+
- Windows 10/11 para empacotar o instalador

## Desenvolvimento
```bash
npm install
npm run dev
```

A aplicação web abre em http://localhost:5173. A API local usa http://localhost:8787.

## Desktop
```bash
npm run desktop
npm run dist:win
```

O instalador Windows é produzido pelo Electron Builder em `release/`.

## Segurança das chaves
As chaves de fornecedores são introduzidas pelo utilizador no painel de IA e enviadas apenas no pedido HTTPS/API correspondente. Esta base não as grava em ficheiros, base de dados, localStorage nem logs. Em produção, usar HTTPS, gestão de segredos do servidor e armazenamento seguro do sistema operativo na aplicação desktop.

## Fornecedores
- OpenAI API
- Google Gemini API
- Anthropic API

Os modelos disponíveis devem ser confirmados na documentação/conta de cada fornecedor. Não são prometidos modelos nem capacidades que não tenham sido testados.

## Separação de projetos
Este repositório é exclusivo do NOVA AI STUDIO. Não contém credenciais nem integrações do NOVA Táxi, NOVA KZ ou KONECTA.
