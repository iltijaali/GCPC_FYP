// Adds a Show/Hide button to every password field on the page.
// The input element itself is kept (just wrapped), so existing code that reads it by id keeps working.
document.querySelectorAll('input[type="password"]').forEach((input) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'password-field';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const button = document.createElement('button');
    button.type = 'button';               // never submits the form
    button.className = 'toggle-password';
    button.textContent = 'Show';
    button.setAttribute('aria-label', 'Show password');
    button.setAttribute('aria-pressed', 'false');
    if (input.id) button.setAttribute('aria-controls', input.id);

    button.addEventListener('click', () => {
        const reveal = input.type === 'password';
        input.type = reveal ? 'text' : 'password';
        button.textContent = reveal ? 'Hide' : 'Show';
        button.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
        button.setAttribute('aria-pressed', String(reveal));
    });
    wrapper.appendChild(button);
});
