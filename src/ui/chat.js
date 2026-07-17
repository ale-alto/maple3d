// Minimal chat input: Enter opens the box, Enter sends, Escape closes.
// The keyboard module ignores game keys while an input is focused.

export function createChatInput(onSend) {
  const input = document.createElement('input');
  input.id = 'chat-input';
  input.type = 'text';
  input.maxLength = 120;
  input.placeholder = 'Say something… (Enter)';
  input.style.display = 'none';
  document.body.appendChild(input);

  function close() {
    input.value = '';
    input.style.display = 'none';
    input.blur();
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.style.display === 'none') {
      input.style.display = 'block';
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
