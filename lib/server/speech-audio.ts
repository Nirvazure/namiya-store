// A byte budget is conservative for both the character limit and multilingual token use.
export function splitSpeechText(text: string, maxBytes = 1800): string[] {
  if (!text.trim()) throw new Error("没有可以朗读的文字。");
  if (maxBytes < 4) throw new Error("语音分段预算太小。");
  const chunks: string[] = [];
  let chunk = "";
  let bytes = 0;
  let boundary = 0;
  for (const character of text) {
    const size = Buffer.byteLength(character, "utf8");
    if (bytes + size > maxBytes) {
      // Prefer a nearby sentence boundary without producing many tiny synthesis requests.
      const split = boundary > chunk.length / 2 ? boundary : chunk.length;
      chunks.push(chunk.slice(0, split));
      chunk = chunk.slice(split);
      bytes = Buffer.byteLength(chunk, "utf8");
      boundary = 0;
    }
    chunk += character;
    bytes += size;
    if (/[。！？.!?\n]/u.test(character)) boundary = chunk.length;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

/** OpenAI PCM is mono, 24 kHz, signed 16-bit little endian. One WAV header covers all segments. */
export function pcmToWave(segments: Buffer[]): Buffer {
  const pcm = Buffer.concat(segments);
  if (!pcm.length || pcm.length % 2 !== 0) throw new Error("语音数据不完整，请重试。");
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(24_000, 24);
  header.writeUInt32LE(48_000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
