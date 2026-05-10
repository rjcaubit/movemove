# Movemove — Instruções para Claude

> Herda de `/Users/rjcaubit/Dev/CLAUDE.md` (workspace global). Este arquivo só
> registra o que é específico do **movemove** — produção, deploy, gotchas.

## Produção (Oracle Cloud)

| Item | Valor |
|------|-------|
| Host | `137.131.157.30` |
| Hostname interno | `vamo-vamo` |
| User | `opc` |
| Distribuição | Oracle Linux 9 |
| Chave SSH | `./keys/ssh-key-2026-04-27.key` (gitignored) |
| Path do app | `/home/opc/movemove` |
| URL pública | http://137.131.157.30 (HTTP — sem domínio/HTTPS ainda) |
| Container | `movemove-frontend` (nginx:alpine servindo `dist/`) |
| Portas | 80, 443 (mas só 80 ativo, sem cert) |

**Verificado em 2026-05-10:** SSH funciona, container `movemove-frontend` Up há ~6 dias na época da verificação. Outras VMs em `~/.ssh/known_hosts` (`146.235.60.226`, `147.15.84.148`) NÃO são da movemove — pertencem a outros projetos do workspace; a chave da movemove não dá acesso a elas.

## Comandos canônicos

### Probe de saúde (read-only, seguro)
```bash
ssh -i keys/ssh-key-2026-04-27.key opc@137.131.157.30 \
  'hostname; docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
```

### Deploy completo
```bash
# 1) Build local
npm run build

# 2) Sobe dist/ pra VM (Dockerfile só copia dist/, então é o que importa)
scp -i keys/ssh-key-2026-04-27.key -r dist opc@137.131.157.30:~/movemove/

# 3) Rebuild + restart container (downtime ~10-30s no nginx)
ssh -i keys/ssh-key-2026-04-27.key opc@137.131.157.30 \
  'cd ~/movemove && docker compose up -d --build'

# 4) Smoke test
curl -sI http://137.131.157.30 | head -3
```

### Logs / debug em produção
```bash
ssh -i keys/ssh-key-2026-04-27.key opc@137.131.157.30 \
  'cd ~/movemove && docker compose logs --tail=80 frontend'
```

### Rollback rápido
```bash
git checkout HEAD~1 -- src/        # ou commit alvo
npm run build
# repete passos 2-4 acima
```

## Regras críticas — específicas do movemove

- **Deploy em produção exige confirmação explícita** do usuário, mesmo com a chave disponível. Não fazer scp+restart sem um "vai" claro.
- **Não tem backend nem DB ainda.** O `docker-compose.yml` só sobe `frontend` (nginx). Os blocos de backend/db estão comentados — quando entrarem, seguirão portas 3301 / 55432 da workspace.
- **Não derrubar/recriar a VM Oracle.** A free tier da Oracle não garante reprovisionamento — se essa VM morrer, recuperar pode ser caro/impossível.
- **Chave SSH no repo (`keys/`) é frágil mas é o padrão atual.** O `.gitignore` cobre, mas redobrar atenção em `git add -A` pra nunca subir. Mover pra `~/.ssh/` com Host alias seria mais seguro.

## Stack-específico

- **Phaser 4 ESM sem default export** — sempre `import * as Phaser from 'phaser'`.
- **Pose layer é invariante.** Cenas Phaser nunca leem `keypoints` crus — usam `EventDetector` (bus) ou helpers de `src/pose/spatialQueries.ts`. Trocar driver de pose (futuro: MoveNet) não deve tocar cenas.
- **Imports relativos com extensão explícita** (`./Player.ts`, não `./Player`).
- **`?debug=1`** ativa keyboard fallback + painel debug + `__movemoveDebug` no `window`. Suporte a `?seed=N`, `?demo=1`, `?landscape=1`/`?portrait=1`, `?dance=check`.
- **Catalog Lingui ainda em identity fallback** (`{}`) — strings retornam o próprio msgid. Quando compilar `pt-BR.po`, atualizar `src/i18n/strings.ts`.

## Documentação canônica do projeto

| Doc | Conteúdo |
|-----|----------|
| `docs/CODEMAP.md` | Estrutura, módulos, padrões, ADRs, histórico SDD |
| `docs/MODULES.md` | Tabela módulos × responsabilidades × arquivos × deps |
| `docs/GAMES.md` | Mecânica/gestos/duração de cada mini-jogo |
| `docs/ARCHITECTURE.md` | Camadas, comunicação, deploy, runtime |
| `docs/movimentos.md` | Catálogo de movimentos detectáveis + pictogramas |
| `docs/CHANGELOG.md` | Histórico por issue |
