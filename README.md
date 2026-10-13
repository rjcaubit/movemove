<div align="center">

<img src="public/og.png" alt="MoveMove" width="640" />

# MoveMove

**Treino em casa, com alguém contando as repetições.**
**Home workouts, with someone counting your reps.**

[**move.mundocapi.com**](https://move.mundocapi.com) · [Português](#-português) · [English](#-english)

</div>

---

## 🇧🇷 Português

O MoveMove usa a câmera do celular ou do computador para contar suas repetições, medir a amplitude de cada movimento e corrigir na hora. Sem conta e sem baixar nada: abre no navegador e funciona.

### O que ele faz

- **Monta o treino para você.** Escolha grupo muscular, objetivo, duração, nível e o que tem em casa. O treino sai pronto, com tempo e descanso certos.
- **Conta direito, não só conta.** Cada repetição ganha uma nota de amplitude. Desceu até o fim, fica verde. Ficou no meio do caminho, a articulação acende em laranja e a voz avisa.
- **Mostra o movimento.** Um boneco guia faz o exercício no ritmo certo, e o treino começa sozinho quando você está bem enquadrado.
- **Desafios por link.** Faça sua marca e mande no WhatsApp. Quem recebe faz o mesmo exercício na frente da câmera e vê na hora quem ganhou.
- **Histórico da semana.** Treinos, minutos, repetições e dias seguidos.
- **Jogos para o dia da preguiça.** Mini-jogos que se jogam com o corpo inteiro.

### Sua câmera fica com você

O vídeo é processado no próprio navegador. Nada é gravado nem enviado para servidor nenhum, e o histórico fica guardado só no seu aparelho. O MoveMove não tem conta, cadastro nem banco de dados.

### Como funciona por dentro

| Camada | O que é |
| --- | --- |
| Pose | [MediaPipe Pose Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker), rodando no navegador em WebAssembly |
| App de treino | TypeScript e DOM puro, sem framework (`src/app/`) |
| Jogos | [Phaser 4](https://phaser.io/) (`src/game/`) |
| Voz | Frases pré-geradas em MP3, com a voz do navegador como reserva |
| Build | [Vite](https://vite.dev/) |

As cenas e as telas nunca leem os pontos do corpo diretamente: tudo passa por uma camada de eventos e consultas em `src/pose/`, o que permite trocar o detector sem mexer no resto. A arquitetura está descrita em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) e o índice de módulos em [`docs/CODEMAP.md`](docs/CODEMAP.md).

### Rodando na sua máquina

Precisa de Node 20 ou mais recente.

```bash
npm install
npm run setup   # baixa o modelo de pose e copia o WebAssembly
npm run dev     # https://localhost:5173
```

O servidor de desenvolvimento usa HTTPS porque o navegador só libera a câmera em endereço seguro. Com `?debug=1` no endereço dá para testar pelo teclado, sem câmera.

### Licença

O código é público para leitura, mas **não é software livre**: todos os direitos reservados.

Você pode ler, estudar e rodar na sua máquina para uso pessoal. Não pode copiar, redistribuir, publicar derivados, hospedar para terceiros nem usar comercialmente sem autorização por escrito. O texto completo está em [`LICENSE`](LICENSE).

### Contato

Dúvida, ideia ou algo travou? Escreva para **suporte@mundocapi.com**.

---

## 🇺🇸 English

MoveMove uses your phone or laptop camera to count your reps, measure the range of motion of every movement and correct you on the spot. No account and nothing to install: it opens in the browser and just works.

> The app interface is in Brazilian Portuguese.

### What it does

- **Builds the workout for you.** Pick muscle group, goal, duration, level and the equipment you have at home. You get a ready-made session with the right work and rest times.
- **Counts properly, not just counts.** Every rep gets a range-of-motion score. Go all the way down and it turns green. Stop halfway and the joint lights up orange while the voice coach tells you.
- **Shows the movement.** An animated figure performs the exercise at the right pace, and the workout starts by itself once you are well framed.
- **Challenges by link.** Set your mark and send it over WhatsApp. Your friend does the same exercise in front of the camera and sees right away who won.
- **Weekly history.** Workouts, minutes, reps and streak.
- **Games for lazy days.** Mini-games you play with your whole body.

### Your camera stays with you

Video is processed inside the browser. Nothing is recorded or sent to any server, and your history is stored only on your device. MoveMove has no accounts, no sign-up and no database.

### Under the hood

| Layer | What it is |
| --- | --- |
| Pose | [MediaPipe Pose Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker), running in the browser on WebAssembly |
| Workout app | TypeScript and plain DOM, no framework (`src/app/`) |
| Games | [Phaser 4](https://phaser.io/) (`src/game/`) |
| Voice | Pre-generated MP3 lines, falling back to the browser's speech synthesis |
| Build | [Vite](https://vite.dev/) |

Scenes and screens never read raw body keypoints: everything goes through an event and query layer in `src/pose/`, so the detector can be swapped without touching the rest. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/CODEMAP.md`](docs/CODEMAP.md) (both in Portuguese).

### Running it locally

Requires Node 20 or newer.

```bash
npm install
npm run setup   # downloads the pose model and copies the WebAssembly files
npm run dev     # https://localhost:5173
```

The dev server uses HTTPS because browsers only allow camera access on secure origins. Add `?debug=1` to the URL to test with the keyboard, without a camera.

### License

The code is public for reading, but it is **not open source**: all rights reserved.

You may read it, study it and run it on your own machine for personal use. You may not copy, redistribute, publish derivative works, host it for others or use it commercially without prior written permission. The full text is in [`LICENSE`](LICENSE).

### Contact

Questions, ideas or something broke? Write to **suporte@mundocapi.com**.

---

<div align="center">

Feito por [MundoCapi](https://mundocapi.com) · Made by [MundoCapi](https://mundocapi.com)

</div>
