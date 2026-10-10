# Movemove — Instruções para Claude

> Herda de `/Users/rjcaubit/Dev/CLAUDE.md` (workspace global). Este arquivo só
> registra o que é específico do **movemove** — produção, deploy, gotchas.

## Produção

O site (https://move.mundocapi.com; `move.callbit.com.br` redireciona 301 pra cá) é servido por um container
`movemove-frontend` (nginx:alpine com o `dist/`), sem porta publicada, atrás de um Cloudflare Tunnel.
**Este repositório é público: endereço de servidor, usuário e chave de acesso não entram aqui.** Eles ficam no mapa
de servidores do workspace (`/Dev/CLAUDE.md`).

### Deploy

```bash
npm run build && scripts/deploy.sh
```

O script envia o `dist/`, reconstrói a imagem no servidor e guarda a anterior com a etiqueta `antes-<data>-<hora>`
(o próprio script mostra como voltar atrás). Depois, conferir:

```bash
curl -sI https://move.mundocapi.com/app/ | head -1
```

## Regras críticas — específicas do movemove

- **Deploy em produção exige confirmação explícita** do usuário, mesmo com a chave disponível. Não publicar sem um "vai" claro.
- **Não tem backend nem DB ainda.** O `docker-compose.yml` só sobe `frontend` (nginx). Os blocos de backend/db estão comentados — quando entrarem, seguirão portas 3301 / 55432 da workspace.
- **Nada de dado de acesso no repositório.** Chaves ficam só em `~/.ssh`; a pasta `keys/` está no `.gitignore` e deve continuar vazia de chave privada. Redobrar atenção em `git add -A`.

## Stack-específico

- **Phaser 4 ESM sem default export** — sempre `import * as Phaser from 'phaser'`.
- **Pose layer é invariante.** Cenas Phaser nunca leem `keypoints` crus — usam `EventDetector` (bus) ou helpers de `src/pose/spatialQueries.ts`. Trocar driver de pose (futuro: MoveNet) não deve tocar cenas.
- **Imports relativos com extensão explícita** (`./Player.ts`, não `./Player`).
- **App × jogos (MoveMove 2.0):** UI principal em `src/app/` (TS/DOM, sem Phaser); lógica de negócio em `src/app/services/` (sem DOM). Phaser só dentro da aba Jogos via `src/game/launch.ts`. Câmera tem dono único: `getPoseRuntime()` — nunca chamar `detector.openCamera` direto.
- **Voz do app = MP3 pré-gerado** (Francisca neural +25%, `public/voice/francisca-25/`). Frases vivem em `src/app/services/voiceLines.ts`; **mudou frase ou catálogo → rodar `npm run voz`** (precisa `edge-tts` + `ffmpeg`). Frase sem MP3 cai sozinha na voz do navegador.
- **`?debug=1` no app:** na tela de treino, `p` pula a preparação, `r` = rep boa, `s` = rep rasa, `h` = alterna prancha, `n` = próxima fase. `?games=1` abre o módulo de jogos direto.
- **`?debug=1`** ativa keyboard fallback + painel debug + `__movemoveDebug` no `window`. Suporte a `?seed=N`, `?demo=1`, `?landscape=1`/`?portrait=1`, `?dance=check`.
- **Catalog Lingui ainda em identity fallback** (`{}`) — strings retornam o próprio msgid. Quando compilar `pt-BR.po`, atualizar `src/i18n/strings.ts`.

## Documentação canônica do projeto

| Doc | Conteúdo |
|-----|----------|
| `docs/CODEMAP.md` | Estrutura, módulos, padrões, ADRs |
| `docs/MODULES.md` | Tabela módulos × responsabilidades × arquivos × deps |
| `docs/GAMES.md` | Mecânica/gestos/duração de cada mini-jogo |
| `docs/ARCHITECTURE.md` | Camadas, comunicação, deploy, runtime |
| `docs/movimentos.md` | Catálogo de movimentos detectáveis + pictogramas |
