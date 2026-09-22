export function initWallet({ getBalance, credit, onSuccess }) {
  const dialog = document.querySelector('#deposit-dialog');
  const form = dialog.querySelector('form');
  const input = dialog.querySelector('input');
  const submit = dialog.querySelector('[type="submit"]');
  const status = dialog.querySelector('[role="status"]');
  const error = dialog.querySelector('[role="alert"]');
  const balance = dialog.querySelector('[data-wallet-balance]');
  const success = dialog.querySelector('[data-deposit-success]');
  const format = (n) => '$' + n.toLocaleString('en-US');
  let pending = false;
  let timer;
  const reset = () => {
    clearTimeout(timer);
    pending = false;
    form.hidden = false;
    success.hidden = true;
    dialog.classList.remove('processing');
    form.querySelector('fieldset').disabled = false;
    submit.textContent = 'Add to balance';
    status.textContent = '';
    error.textContent = '';
  };
  document.querySelector('#deposit-button').onclick = () => {
    reset();
    balance.textContent = format(getBalance());
    input.value = '';
    dialog.showModal();
    input.focus();
  };
  dialog.addEventListener('close', reset);
  dialog.querySelectorAll('[data-close]').forEach((button) => {
    button.onclick = () => dialog.close();
  });
  dialog.querySelectorAll('[data-amount]').forEach((button) => {
    button.onclick = () => {
      input.value = button.dataset.amount;
      error.textContent = '';
      input.focus();
    };
  });
  input.addEventListener('input', () => {
    error.textContent = '';
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (pending) return;
    const amount = Number(input.value);
    if (
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      !Number.isSafeInteger(getBalance() + amount)
    ) {
      error.textContent = 'Enter a valid whole amount greater than zero.';
      input.focus();
      return;
    }
    pending = true;
    form.querySelector('fieldset').disabled = true;
    dialog.classList.add('processing');
    submit.textContent = 'Adding funds…';
    status.textContent = 'Updating your demo wallet';
    timer = setTimeout(() => {
      // Apply to the current balance: a round may finish while the wallet is open.
      if (!Number.isSafeInteger(getBalance() + amount)) {
        reset();
        error.textContent = 'This amount exceeds the available wallet limit.';
        return;
      }
      credit(amount);
      pending = false;
      dialog.classList.remove('processing');
      balance.textContent = format(getBalance());
      form.hidden = true;
      success.hidden = false;
      dialog.querySelector('[data-added]').textContent = '+' + format(amount);
      status.textContent = 'Deposit complete';
      success.querySelector('button').focus();
      onSuccess();
    }, 1400);
  });
  const lobby = document.querySelector('#lobby-dialog');
  document.querySelector('#lobby-button').onclick = () => lobby.showModal();
  lobby.querySelectorAll('[data-close]').forEach((button) => {
    button.onclick = () => lobby.close();
  });
}
