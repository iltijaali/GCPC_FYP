export default function Loading({ label = 'Loading…' }) {
  return (
    <p className="py-8 text-center text-lg text-gray-600 animate-pulse" role="status">
      {label}
    </p>
  );
}
