const fs = require('fs');
const path = require('path');

function generateChimeWav(filePath) {
  const sampleRate = 44100;
  const duration = 0.65; // seconds
  const totalSamples = Math.floor(sampleRate * duration);
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = totalSamples * blockAlign;

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate pleasant dual-tone bell chime:
  // Note 1: E5 (659.25 Hz) with gentle harmonic E6 (1318.5 Hz)
  // Note 2: A5 (880 Hz) fading in at 0.12s with harmonic A6 (1760 Hz)
  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    
    // Envelope 1: starts at t=0
    const env1 = Math.exp(-t * 8.0);
    const sample1 = env1 * (
      0.65 * Math.sin(2 * Math.PI * 659.25 * t) +
      0.25 * Math.sin(2 * Math.PI * 1318.5 * t) +
      0.10 * Math.sin(2 * Math.PI * 1977.75 * t)
    );

    // Envelope 2: starts at t=0.10s
    let sample2 = 0;
    if (t >= 0.10) {
      const t2 = t - 0.10;
      const env2 = Math.exp(-t2 * 6.5);
      sample2 = env2 * (
        0.70 * Math.sin(2 * Math.PI * 880.0 * t2) +
        0.25 * Math.sin(2 * Math.PI * 1760.0 * t2) +
        0.05 * Math.sin(2 * Math.PI * 2640.0 * t2)
      );
    }

    // Combine and apply master gain
    let mixed = (sample1 * 0.5 + sample2 * 0.7);
    mixed = Math.max(-1.0, Math.min(1.0, mixed));

    // Convert to 16-bit signed integer
    const intVal = Math.floor(mixed * 32767);
    buffer.writeInt16LE(intVal, offset);
    offset += 2;
  }

  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, buffer);
  console.log('Saved sound to:', filePath, 'Size:', buffer.length, 'bytes');
}

// Generate for customer app
const customerResRaw = path.join(__dirname, '..', 'customer_app', 'android', 'app', 'src', 'main', 'res', 'raw');
generateChimeWav(path.join(customerResRaw, 'notification_sound.wav'));
generateChimeWav(path.join(customerResRaw, 'notification_sound.mp3'));

// Generate for partner delivery app
const partnerResRaw = path.join(__dirname, '..', 'partner_delivery_app', 'android', 'app', 'src', 'main', 'res', 'raw');
generateChimeWav(path.join(partnerResRaw, 'notification_sound.wav'));
generateChimeWav(path.join(partnerResRaw, 'notification_sound.mp3'));
