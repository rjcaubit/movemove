/**
 * Gera o pacote de voz do app: um MP3 por frase de `allLines()`, com a voz
 * neural Francisca (+25%) via edge-tts. Incremental: só grava o que falta.
 *
 *   npm run voz            # gera/atualiza public/voice/<VOICE_ID>/
 *
 * Requer `edge-tts` (pip install edge-tts) e `ffmpeg` no PATH. O silêncio do
 * começo e do fim é cortado pra fala sair sem atraso.
 */
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { allLines } from '../src/app/services/voiceLines.ts';
import { VOICE_ID } from '../src/app/services/voicePack.ts';

const VOICE = 'pt-BR-FranciscaNeural';
const RATE = '+25%';
const OUT = join(process.cwd(), 'public', 'voice', VOICE_ID);
const run = promisify(execFile);
// Corta silêncio inicial e final (reverte, corta o "início", reverte de volta).
const TRIM = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse';

const norm = (t: string): string => t.trim().replace(/\s+/g, ' ');
const fileFor = (text: string): string =>
  `${createHash('sha1').update(`${VOICE}|${RATE}|trim1|${text}`).digest('hex').slice(0, 12)}.mp3`;

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const lines = [...new Set(allLines().map(norm))];
  const index: Record<string, string> = {};
  const todo: Array<[string, string]> = [];
  for (const text of lines) {
    const f = fileFor(text);
    index[text] = f;
    if (!existsSync(join(OUT, f))) todo.push([text, f]);
  }
  console.log(`${lines.length} frases · ${todo.length} a gerar`);
  let done = 0;
  const worker = async (): Promise<void> => {
    for (let item = todo.shift(); item; item = todo.shift()) {
      const [text, f] = item;
      const raw = join(tmpdir(), `mm-voz-${f}`);
      await run('edge-tts', ['--voice', VOICE, `--rate=${RATE}`, '--text', text, '--write-media', raw]);
      await run('ffmpeg', ['-loglevel', 'error', '-y', '-i', raw, '-af', TRIM, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k', join(OUT, f)]);
      unlinkSync(raw);
      done += 1;
      if (done % 10 === 0) console.log(`  ${done} gerados`);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  // Remove áudios de frases que não existem mais.
  const keep = new Set(Object.values(index));
  for (const f of readdirSync(OUT)) if (f.endsWith('.mp3') && !keep.has(f)) unlinkSync(join(OUT, f));
  writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 0));
  const bytes = readdirSync(OUT).reduce((a, f) => a + statSync(join(OUT, f)).size, 0);
  console.log(`ok · ${Object.keys(index).length} frases · ${(bytes / 1024).toFixed(0)} KB em ${OUT}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
