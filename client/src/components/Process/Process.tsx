const steps = [
  ['01', 'Schedule your visit'],
  ['02', 'Prepare your lab order'],
  ['03', 'We come to you'],
  ['04', 'Your specimen is handled for the designated laboratory'],
];

export default function Process() {
  return (
    <section className="section section-soft" id="process">
      <div className="container">
        <p className="eyebrow">How it works</p>
        <h2>A simpler way to get bloodwork done.</h2>
        <ol className="process-list">
          {steps.map(([number, label]) => (
            <li key={number}><span>{number}</span><strong>{label}</strong></li>
          ))}
        </ol>
      </div>
    </section>
  );
}
