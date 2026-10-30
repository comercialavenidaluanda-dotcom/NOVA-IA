# NOVA AI STUDIO

Plataforma web e desktop para criação multimédia assistida por IA e desenvolvimento por prompts.

## O que já existe nesta fundação
- Interface React/TypeScript em português.
- Importação local de vídeo, áudio e imagem, com pré-visualização.
- Biblioteca de media e timeline inicial com pistas de vídeo e áudio.
- Ajustes básicos por clip: ponto de entrada/saída, velocidade, volume e filtros visuais.
- Camada de título/legenda com texto, cor e tamanho configuráveis.
- Área NOVA AI Developer com pedidos de chat para OpenAI, Google Gemini e Anthropic.
- Shell Electron e configuração NSIS para instalador Windows.
- GitHub Actions para compilar o instalador em Windows quando há alterações na branch main ou tags v*.

## Ainda em desenvolvimento
Esta versão não é ainda um editor profissional completo. Exportação/renderização final, transições reais, keyframes, composição avançada, efeitos 3D, geração de vídeo/imagem, avatares, lip-sync, voz, música e colaboração ainda precisam de implementação e testes. Não se deve considerar um módulo disponível só por aparecer na interface.

## Requisitos
- Node.js 20+
- npm 10+
- Windows 10/11 para empacotar o instalador

## Desenvolvimento
```bash
npm install
npm run dev
```

A aplicação web abre em http://localhost:5173. A API local usa http://127.0.0.1:8787.

## Desktop
```bash
npm run desktop
npm run dist:win
```

O instalador Windows é produzido pelo Electron Builder em `release/`.

## Integrações de IA
A API tem adaptadores iniciais de chat para OpenAI, Google Gemini e Anthropic. O utilizador fornece o ID do modelo ativo na sua conta e a respetiva chave. As chamadas usam os endpoints oficiais dos fornecedores. As chaves são enviadas no corpo do pedido ao serviço local e encaminhadas no servidor; não são gravadas em ficheiros, localStorage ou logs. A chave Gemini é enviada num cabeçalho HTTP, não no URL.

Para produção, colocar o gateway atrás de autenticação e HTTPS, implementar gestão segura de credenciais, limites de utilização, auditoria e proteção contra abuso. Nunca colocar chaves de API em código-fonte ou no repositório.

## Compilação automática
O workflow `.github/workflows/windows-installer.yml` executa verificação TypeScript, build e empacotamento NSIS em runner Windows. O instalador só estará disponível como artefacto depois de uma execução concluída com sucesso.

## Separação de projetos
Este repositório é exclusivo do NOVA AI STUDIO. Não contém credenciais nem integrações do NOVA Táxi, NOVA KZ ou KONECTA.
