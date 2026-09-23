export function initSocial({ setVolume }) {
  const $ = (s) => document.querySelector(s);
  const panel = $('#chat-panel');
  const toggle = $('#chat-toggle');
  const forms = [...document.querySelectorAll('[data-chat-form]')];
  let messages = [];
  try {
    const saved = JSON.parse(sessionStorage.getItem('fortune-city-chat') || '[]');
    if (Array.isArray(saved))
      messages = saved
        .filter((m) => typeof m.text === 'string' && Number.isFinite(m.time))
        .slice(-100)
        .map((m) => ({ text: m.text.slice(0, 180), time: m.time }));
  } catch {}
  function render() {
    for (const [selector, items] of [
      ['#chat-messages', messages],
      ['#quick-messages', messages.slice(-3)],
    ]) {
      const list = $(selector);
      list.replaceChildren();
      if (!items.length && selector === '#chat-messages') {
        const empty = document.createElement('p');
        empty.className = 'chat-empty';
        empty.textContent = 'Your conversation starts here. Messages stay in this browser session.';
        list.append(empty);
      }
      for (const message of items) {
        const row = document.createElement('div');
        row.className = 'chat-message';
        const name = document.createElement('small');
        name.textContent = 'You';
        const text = document.createElement('p');
        text.dir = 'auto';
        text.textContent = message.text;
        row.append(name, text);
        if (selector === '#chat-messages') {
          const time = document.createElement('time');
          time.textContent = new Date(message.time).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          row.append(time);
        }
        list.append(row);
      }
      list.scrollTop = list.scrollHeight;
    }
  }
  function openChat(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('chat-open', open);
    if (open) {
      $('#volume-panel').hidden = true;
      $('#sound').setAttribute('aria-expanded', 'false');
      $('#chat-messages').scrollTop = $('#chat-messages').scrollHeight;
      panel.querySelector('input').focus();
    } else toggle.focus();
  }
  toggle.onclick = () => openChat(panel.hidden);
  $('#chat-close').onclick = () => openChat(false);
  forms.forEach((form) => {
    const input = form.querySelector('input');
    const send = form.querySelector('button');
    input.addEventListener('input', () => (send.disabled = !input.value.trim()));
    form.onsubmit = (event) => {
      event.preventDefault();
      const text = input.value.trim().slice(0, 180);
      if (!text) return;
      messages.push({ text, time: Date.now() });
      messages = messages.slice(-100);
      try {
        sessionStorage.setItem('fortune-city-chat', JSON.stringify(messages));
      } catch {}
      input.value = '';
      send.disabled = true;
      render();
    };
  });
  render();
  const sound = $('#sound');
  const volumePanel = $('#volume-panel');
  const slider = $('#volume-level');
  const mute = $('#volume-mute');
  let volume = 3,
    previous = 3;
  function apply(value) {
    volume = Math.max(0, Math.min(100, Number(value) || 0));
    if (volume > 0) previous = volume;
    slider.value = String(volume);
    slider.style.setProperty('--volume', volume + '%');
    $('#volume-value').textContent = volume + '%';
    mute.textContent = volume ? 'Mute' : 'Unmute';
    mute.setAttribute('aria-pressed', String(!volume));
    sound.classList.toggle('is-muted', !volume);
    sound.setAttribute(
      'aria-label',
      volume ? `Sound settings, volume ${volume}%` : 'Sound settings, muted',
    );
    setVolume(volume / 100);
  }
  sound.onclick = () => {
    volumePanel.hidden = !volumePanel.hidden;
    sound.setAttribute('aria-expanded', String(!volumePanel.hidden));
    if (!volumePanel.hidden) slider.focus();
  };
  slider.oninput = () => apply(slider.value);
  mute.onclick = () => apply(volume ? 0 : previous);
  document.addEventListener('pointerdown', (e) => {
    if (!volumePanel.hidden && !volumePanel.contains(e.target) && !sound.contains(e.target)) {
      volumePanel.hidden = true;
      sound.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!volumePanel.hidden) {
      volumePanel.hidden = true;
      sound.setAttribute('aria-expanded', 'false');
      sound.focus();
    } else if (!panel.hidden) openChat(false);
  });
  apply(3);
}
