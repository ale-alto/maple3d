// Classic chat strip: "To All" channel chip + an always-visible input
// docked above the status bar. Enter focuses it, Enter sends, Escape
// blurs. The keyboard module ignores game keys while an input is focused.

export function createChatInput(onSend) {
  const bar = document.createElement('div');
  bar.id = 'chat-bar';
  bar.innerHTML = `<span id="chat-channel">To All</span>`;

  const input = document.createElement('input');
  input.id = 'chat-input';
  input.type = 'text';
  input.maxLength = 120;
  bar.appendChild(input);
  document.body.appendChild(bar);

  function close() {
    input.value = '';
    input.blur();
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement !== input) {
      input.focus();
      e.preventDefault();
    }
  });
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      const text = input.value.trim();
      if (text) onSend(text);
      close();
    } else if (e.key === 'Escape') {
      close();
    }
  });

  return { close };
}
