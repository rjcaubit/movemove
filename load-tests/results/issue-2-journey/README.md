# Journey de teste — Issue #2 (Fase 0 PoC)

Esta pasta contém logs e screenshots da validação empírica da Fase 0 — Seção 4.4 e 4.5 do `EXERGAME_PROJETO.md`.

## Metodologia

Validação manual humana (criança real do dev). FPS lido pelo painel de debug toggle. Latência subjetiva. Falsos positivos contados manualmente.

## Devices testados

| Device | OS | Browser | FPS médio | Acerto subjetivo (jump/duck/lane) | Falsos positivos jump (1min parado) | Notas |
|--------|----|---------|-----------|------------------------------------|--------------------------------------|-------|
| iPhone SE 2020 | iOS 18 | Safari | _PREENCHER_ | _PREENCHER_ | _PREENCHER_ | _PREENCHER_ |
| Galaxy A54 | Android 14 | Chrome | _PREENCHER_ | _PREENCHER_ | _PREENCHER_ | _PREENCHER_ |
| MacBook Air M1 | macOS 14 | Chrome | _PREENCHER_ | _PREENCHER_ | _PREENCHER_ | _PREENCHER_ |

## Iluminações testadas

- [ ] Sala normal (dia)
- [ ] Sala normal (noite com luz acesa)
- [ ] Sala com contraluz (janela atrás)
- [ ] Pouca luz

## Tipos de roupa

- [ ] Roupa colada
- [ ] Roupa larga
- [ ] Com casaco/chapéu

## Critérios de aceitação (Seção 4.4)

- [ ] 30+ FPS no celular alvo
- [ ] Acerto subjetivo > 85% pra jump/duck/lane (em 20 tentativas, ≤ 3 perdas)
- [ ] Latência percebida < 150ms
- [ ] Calibração funciona pra criança E adulto sem mudar código
- [ ] Não falha catastroficamente em baixa luz ou pessoas no fundo

## Bugs encontrados

(adicionar conforme descoberta)

## Achados de implementação (do /sdd-execute)

- **Bundle excede RNF04 do spec.** Modelo `pose_landmarker_lite.task` é 5.5MB (não 3MB). WASM SIMD é 11MB. Total `dist/` após otimização (só SIMD WASM, sem source maps): 18MB; com gzip do Cloudflare ≈ 9-10MB. **RNF04 (<5MB) é irreal com MediaPipe lite — atualizar budget na próxima fase ou aceitar que primeira visita seja >5MB.**
- WASM nosimd e module variants foram removidos do build (~21MB economizados). Pode haver regressão em browsers muito antigos sem SIMD — improvável em iPhone SE 2020 / Android mid-range modernos.
- Vite source maps desabilitados em produção — economiza ~400KB.

## Screenshots

Em `./screenshots/` numerados sequencialmente. Caption no commit message.
