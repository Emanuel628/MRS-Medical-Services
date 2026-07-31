const items = [
  ['Convenient', 'We come to you.'],
  ['Professional', 'Experienced, careful service.'],
  ['Comfortable', 'Care in familiar surroundings.'],
];

export default function TrustBar() {
  return (
    <section className="trust-bar" aria-label="Why choose MRS Medical Services">
      <div className="container trust-grid">
        {items.map(([title, text]) => (
          <div className="trust-item" key={title}>
            <strong>{title}</strong>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
