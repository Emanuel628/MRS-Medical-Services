const services = [
  'Routine blood draws',
  'Specialty lab collections',
  'Standing-order visits',
  'Senior and homebound visits',
  'Assisted-living collections',
  'Employer and group services',
];

export default function Services() {
  return (
    <section className="section" id="services">
      <div className="container split-section">
        <div>
          <p className="eyebrow">Our services</p>
          <h2>Care that meets you where you are.</h2>
          <p>Services will be finalized to match the company’s exact licensing, laboratory relationships, and operating policies.</p>
        </div>
        <ul className="service-list">
          {services.map((service) => <li key={service}>{service}</li>)}
        </ul>
      </div>
    </section>
  );
}
