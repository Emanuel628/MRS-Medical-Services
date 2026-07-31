const servicesLeft = [
  'Routine Blood Draws',
  'Specialty Lab Collections',
  'Standing Orders',
  'Wellness Testing',
];

const servicesRight = [
  'Employer & Occupational Testing',
  'Assisted Living & Facility Visits',
  'Pediatric Collections',
  'Hospital Discharge Collections',
];

const steps = [
  ['1', 'Schedule', 'Book online or give us a call.'],
  ['2', 'We Come to You', 'We arrive on time at your location.'],
  ['3', 'Blood is Collected', 'Quick, comfortable, and professional.'],
  ['4', 'Delivered to Lab', 'Your specimen is delivered to the laboratory.'],
];

const Check = () => <span className="check" aria-hidden="true">✓</span>;

const PhoneIcon = () => (
  <svg className="phone-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7.2 3.5 9.4 7c.3.5.2 1.1-.2 1.5l-1.4 1.4a15.4 15.4 0 0 0 6.3 6.3l1.4-1.4c.4-.4 1-.5 1.5-.2l3.5 2.2c.5.3.7.9.5 1.5l-.7 2.1c-.2.7-.9 1.1-1.6 1.1C9.8 21.5 2.5 14.2 2.5 5.3c0-.7.4-1.4 1.1-1.6l2.1-.7c.6-.2 1.2 0 1.5.5Z" />
  </svg>
);

export default function LandingPage() {
  return (
    <div className="page">
      <header className="header">
        <div className="wrap header-inner">
          <a className="logo" href="#top" aria-label="M.R.S. Medical Services home">
            <img className="logo-image" src="/images/mrs-logo-exact.jpg" alt="M.R.S. Medical Services" />
          </a>

          <nav aria-label="Primary navigation">
            <a href="#services">SERVICES</a>
            <a href="#process">HOW IT WORKS</a>
            <a href="#area">SERVICE AREA</a>
            <a href="#about">ABOUT</a>
            <a href="#faq">FAQS</a>
            <a href="#contact">CONTACT</a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <h1>Professional<br />Blood Draws</h1>
            <h2>In the Comfort of Your Home</h2>
            <p>Skip the waiting room. We travel to your home, office, or facility for safe, convenient specimen collection with care you can trust.</p>

            <div className="hero-buttons">
              <a className="btn primary" href="#contact">SCHEDULE A VISIT</a>
              <a className="btn secondary" href="tel:+17327660266"><PhoneIcon />CALL NOW</a>
            </div>

            <div className="zip-box" id="area">
              <strong>Need a blood draw?</strong>
              <span>Enter your ZIP code to confirm we service your area.</span>
              <div className="zip-row">
                <input placeholder="Enter ZIP code" inputMode="numeric" />
                <button type="button">CHECK AVAILABILITY</button>
              </div>
            </div>
          </div>

          <div className="hero-photo" role="img" aria-label="Mobile phlebotomist performing an in-home blood draw" />
        </section>

        <section className="benefits"><div className="wrap benefits-grid">
          <article><div className="circle">⌂</div><div><strong>Convenient</strong><p>We come to you.</p></div></article>
          <article><div className="circle">♢</div><div><strong>Professional</strong><p>Certified, experienced, and committed to your safety.</p></div></article>
          <article><div className="circle">♡</div><div><strong>Comfortable</strong><p>Compassionate care in the comfort of your own space.</p></div></article>
        </div></section>

        <section className="services" id="services"><div className="wrap services-grid">
          <div className="section-title"><span>SERVICES</span><h2>Blood Collection<br />Made Easy</h2><i /><p>We provide a full range of mobile phlebotomy services for individuals, families, providers, and organizations.</p></div>
          <div className="service-column">{servicesLeft.map((service) => <div key={service}><Check />{service}</div>)}</div>
          <div className="service-column">{servicesRight.map((service) => <div key={service}><Check />{service}</div>)}</div>
        </div></section>

        <section className="process" id="process"><div className="wrap process-grid">
          <div className="section-title"><span>HOW IT WORKS</span><h2>Simple. Safe.<br />Convenient.</h2><i /></div>
          <div className="steps">{steps.map(([number, title, description], index) => <article key={number}><div className="step-top"><b>{number}</b>{index < 3 && <em>→</em>}</div><strong>{title}</strong><p>{description}</p></article>)}</div>
        </div></section>

        <section className="proof" id="about"><div className="wrap proof-grid">
          <div className="credentials"><span>TRUST &amp; CREDENTIALS</span><p><Check />NHA Certified Phlebotomist</p><p><Check />CPR &amp; First Aid Certified</p><p><Check />Insured &amp; Background Checked</p><p><Check />HIPAA Compliant Practices</p><a className="btn secondary" href="#contact">LEARN MORE ABOUT US</a></div>
          <div className="reviews"><span>WHAT OUR PATIENTS SAY</span><div className="review-grid"><blockquote><b>★★★★★</b><p>“Such a great experience! She was on time, professional, and made me feel so comfortable. Highly recommended!”</p><cite>— J. M.</cite></blockquote><blockquote><b>★★★★★</b><p>“Having someone come to my home made all the difference. Friendly, efficient, and so convenient.”</p><cite>— L. T.</cite></blockquote></div></div>
        </div></section>

        <section className="cta" id="contact"><div className="wrap cta-inner"><div className="calendar">▣</div><div><h3>Ready to Schedule?</h3><p>We’re here to make your blood draw simple and stress-free.</p></div><a className="btn teal" href="mailto:contact@mrsmedicalservices.com">SCHEDULE YOUR VISIT</a></div></section>
      </main>
    </div>
  );
}
