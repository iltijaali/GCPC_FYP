import { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

// A password field with a show/hide button. It accepts every normal <input> prop (id, value, onChange,
// autoComplete, ...); only `type` is managed here. The button never submits the form, announces its state
// to screen readers, and can be reached with the keyboard right after the field.
export default function PasswordInput({ className = '', id, ...props }) {
  const [visible, setVisible] = useState(false);
  const label = visible ? 'Hide password' : 'Show password';

  return (
    <div className="relative">
      <input
        {...props}
        id={id}
        type={visible ? 'text' : 'password'}
        className={className}
        style={{ paddingRight: '2.75rem' }}   // room for the button, whatever padding the caller set
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={label}
        aria-pressed={visible}
        aria-controls={id}
        title={label}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r text-gray-500 hover:text-indigo-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {visible ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
      </button>
    </div>
  );
}
