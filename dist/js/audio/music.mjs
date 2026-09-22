// Continuous lounge score with separate studio and city arrangements.
export function createMusic(ctx, isCity, output = ctx.destination) {
  const master = ctx.createGain(),
    compressor = ctx.createDynamicsCompressor();
  master.gain.value = 0;
  master.connect(compressor);
  compressor.connect(output);
  const delay = ctx.createDelay(1),
    feedback = ctx.createGain(),
    wet = ctx.createGain();
  delay.delayTime.value = 0.273;
  feedback.gain.value = 0.22;
  wet.gain.value = 0.15;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(master);
  const chords = [
    [48, 55, 59, 64, 67],
    [45, 52, 55, 59, 64],
    [50, 57, 60, 64, 69],
    [43, 53, 57, 62, 65],
  ];
  const melody = [
    76,
    null,
    79,
    83,
    81,
    79,
    76,
    null,
    74,
    76,
    79,
    null,
    81,
    79,
    76,
    74,
    72,
    null,
    76,
    79,
    83,
    81,
    79,
    null,
    77,
    76,
    74,
    null,
    71,
    74,
    76,
    null,
  ];
  let enabled = false,
    next = ctx.currentTime,
    step = 0;
  function note(midi, time, length, volume, type = 'sine') {
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    osc.connect(gain);
    gain.connect(master);
    if (midi > 60) gain.connect(delay);
    osc.start(time);
    osc.stop(time + length + 0.02);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  const noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.12), ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++)
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
  function brush(time, accent) {
    const src = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    src.buffer = noise;
    filter.type = 'highpass';
    filter.frequency.value = 6500;
    gain.gain.value = accent ? 0.026 : 0.012;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(time);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
  function schedule() {
    if (!enabled || ctx.state !== 'running') return;
    if (next < ctx.currentTime - 0.2) next = ctx.currentTime + 0.03;
    while (next < ctx.currentTime + 0.2) {
      const city = isCity(),
        bar = Math.floor(step / 8),
        beat = step % 8,
        chord = chords[bar % 4],
        unit = 60 / (city ? 114 : 108) / 2;
      if (beat % 2 === 0) note(chord[0] - 12 + (beat === 4 ? 7 : 0), next, 0.38, 0.1, 'triangle');
      if (beat === 0 || beat === 3 || beat === 6)
        chord.slice(1).forEach((n, i) => note(n, next + i * 0.009, 0.65, 0.024, 'triangle'));
      const m = melody[(step + Math.floor(bar / 4) * 8) % melody.length];
      if (m !== null) {
        note(m + (city ? 12 : 0), next, 0.42, 0.045);
        note(m + 12 + (city ? 12 : 0), next, 0.19, 0.008);
      }
      brush(next, beat === 2 || beat === 6);
      next += unit * (beat % 2 ? 0.88 : 1.12);
      step++;
    }
  }
  const timer = setInterval(schedule, 80);
  return {
    setEnabled(value) {
      enabled = value;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(value ? 0.65 : 0, ctx.currentTime, 0.12);
      if (value) {
        ctx.resume();
        next = ctx.currentTime + 0.03;
        schedule();
      }
    },
    dispose() {
      clearInterval(timer);
      master.disconnect();
      delay.disconnect();
      feedback.disconnect();
      wet.disconnect();
      compressor.disconnect();
    },
  };
}
