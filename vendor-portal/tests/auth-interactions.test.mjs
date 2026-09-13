import test from 'node:test';
import assert from 'node:assert/strict';

test('Password toggle button switches input type without erasing typed value', () => {
  const input = {
    type: 'password',
    value: 'MySecretPassword123!',
    selectionStart: 0,
    selectionEnd: 0,
    setSelectionRange(start, end) {
      this.selectionStart = start;
      this.selectionEnd = end;
    },
    focus() {
      this.focused = true;
    }
  };

  const button = {
    innerHTML: 'eye',
    attributes: {},
    setAttribute(k, v) { this.attributes[k] = v; },
    closest(_selector) {
      return { querySelector: () => input };
    }
  };

  // Simulate toggle-password logic from vendor-portal/app.js
  let showPassword = false;
  function handleTogglePassword(btn) {
    const wrapper = btn.closest('.input-wrapper');
    const targetInput = wrapper?.querySelector('input');
    if (targetInput) {
      const isPassword = targetInput.type === 'password';
      targetInput.type = isPassword ? 'text' : 'password';
      showPassword = isPassword;
      btn.innerHTML = isPassword ? 'eye-off' : 'eye';
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      btn.setAttribute('title', isPassword ? 'Hide password' : 'Show password');
      const len = targetInput.value.length;
      targetInput.setSelectionRange(len, len);
      targetInput.focus();
    }
  }

  // Initial state
  assert.equal(input.type, 'password');
  assert.equal(input.value, 'MySecretPassword123!');

  // Click 1: Show password
  handleTogglePassword(button);
  assert.equal(input.type, 'text');
  assert.equal(input.value, 'MySecretPassword123!', 'Password value MUST be preserved');
  assert.equal(showPassword, true);
  assert.equal(button.attributes['aria-label'], 'Hide password');
  assert.equal(input.selectionStart, 'MySecretPassword123!'.length);

  // Click 2: Hide password
  handleTogglePassword(button);
  assert.equal(input.type, 'password');
  assert.equal(input.value, 'MySecretPassword123!', 'Password value MUST still be preserved');
  assert.equal(showPassword, false);
  assert.equal(button.attributes['aria-label'], 'Show password');
});

test('Session gate onAuthStateChange does not re-render unauthenticated auth forms on initial load', () => {
  let renderCount = 0;
  const state = {
    session: null,
  };
  function render() {
    renderCount++;
  }

  // Simulate onAuthStateChange logic from vendor-portal/app.js
  function onAuthStateChangeHandler(_event, nextSession) {
    const prevSession = state.session;
    state.session = nextSession;
    if (!nextSession) {
      if (prevSession) {
        render();
      }
    } else if (!prevSession && nextSession) {
      render();
    }
  }

  // Initial boot: user opens portal while unauthenticated (session is null)
  onAuthStateChangeHandler('INITIAL_SESSION', null);
  assert.equal(renderCount, 0, 'Must NOT re-render auth form if session was already null');

  // User logs in: nextSession arrives
  onAuthStateChangeHandler('SIGNED_IN', { access_token: 'valid-jwt' });
  assert.equal(renderCount, 1, 'Must render/load workspace when session becomes active');

  // User logs out: session goes from active to null
  onAuthStateChangeHandler('SIGNED_OUT', null);
  assert.equal(renderCount, 2, 'Must render login form when previously authenticated session is signed out');
});

test('Real-time email input tracking keeps state.pendingEmail in sync without wiping', () => {
  const state = {
    pendingEmail: '',
  };

  function onInput(target) {
    if (target.id === 'email' || target.name === 'email') {
      state.pendingEmail = target.value;
    }
  }

  onInput({ id: 'email', value: 'vendor@sellfastbuyfast.com' });
  assert.equal(state.pendingEmail, 'vendor@sellfastbuyfast.com');

  onInput({ id: 'email', value: 'chimzycharles001@gmail.com' });
  assert.equal(state.pendingEmail, 'chimzycharles001@gmail.com');
});
