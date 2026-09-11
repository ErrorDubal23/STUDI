// Truco para que iOS no suspenda la pagina cuando el telefono se bloquea
// mientras se esta grabando: Safari mantiene con vida el JS de una pestana/PWA
// en segundo plano solo mientras haya audio/video reproduciendose, asi que
// mientras dura la grabacion mantenemos un loop de audio casi inaudible
// sonando en paralelo. No se usa silencio absoluto porque algunos motores
// tratan un buffer de amplitud cero igual que "sin reproducir" y lo pausan.

function crearWavCasiSilencioso(duracionSeg = 1, sampleRate = 8000) {
  const numSamples = duracionSeg * sampleRate;
  const dataSize = numSamples;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function escribirTexto(offset, texto) {
    for (let i = 0; i < texto.length; i++) view.setUint8(offset + i, texto.charCodeAt(i));
  }

  escribirTexto(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  escribirTexto(8, "WAVE");
  escribirTexto(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  escribirTexto(36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    view.setUint8(44 + i, i % 2 === 0 ? 127 : 129);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export function crearAudioMantenerActivo() {
  const url = URL.createObjectURL(crearWavCasiSilencioso());
  const audio = new Audio(url);
  audio.loop = true;
  audio.volume = 0.02;
  audio.setAttribute("playsinline", "");
  audio.setAttribute("preload", "auto");
  return audio;
}

export function destruirAudioMantenerActivo(audio) {
  if (!audio) return;
  audio.pause();
  const src = audio.src;
  audio.removeAttribute("src");
  audio.load();
  if (src) URL.revokeObjectURL(src);
}

export async function solicitarWakeLock() {
  if (!("wakeLock" in navigator)) return null;
  try {
    return await navigator.wakeLock.request("screen");
  } catch {
    return null;
  }
}
