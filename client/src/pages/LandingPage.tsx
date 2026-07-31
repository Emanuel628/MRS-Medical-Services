const services = [
  ['Routine Blood Draws', 'Common physician-ordered bloodwork collected at home.'],
  ['Specialty Lab Collections', 'Careful collection for specialty kits and outside laboratories.'],
  ['Standing Orders', 'Recurring visits for patients with ongoing laboratory orders.'],
  ['Wellness Testing', 'Convenient collection support for approved wellness panels.'],
  ['Employer Testing', 'On-site collection options for workplaces and organizations.'],
  ['Assisted Living Visits', 'Reliable mobile visits for residents and care communities.'],
  ['Hospital Discharge Collections', 'Follow-up collections completed where the patient is recovering.'],
];

const steps = [
  ['1', 'Schedule online', 'Choose the service and visit time that works for you.'],
  ['2', 'We come to you', 'Your phlebotomist arrives at your home, office, or facility.'],
  ['3', 'Blood is collected', 'The collection is completed safely and professionally.'],
  ['4', 'Delivered to the lab', 'Your specimen is prepared for the designated laboratory.'],
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function ServiceIcon({ type }: { type: number }) {
  const icons = [
    <path key="a" d="M8 3h8v4H8zM7 7h10v13H7zM10 11h4M10 15h4" />,
    <path key="b" d="M12 2v20M5 9h14M7 5h10M7 19h10" />,
    <path key="c" d="M7 3h10v18H7zM10 7h4M10 11h4M10 15h4" />,
    <path key="d" d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18" />,
    <path key="e" d="M4 20h16M6 20V8h12v12M9 8V4h6v4M9 13h6" />,
    <path key="f" d="M4 20h16M6 20V6h12v14M9 10h2M13 10h2M9 14h2M13 14h2" />,
    <path key="g" d="M4 20h16M5 20V9h14v11M8 9V5h8v4M9 13h6M12 10v6" />,
  ];

  return (
    <span className="service-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">{icons[type]}</svg>
    </span>
  );
}

export default function LandingPage() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="#top" aria-label="MRS Medical Services home">
            <span className="brand-mark" aria-hidden="true"><span>M</span></span>
            <span className="brand-copy"><strong>MRS</strong><small>Medical Services</small></span>
          </a>

          <nav className="desktop-nav" aria-label="Primary navigation">
            <a href="#services">Services</a>
            <a href="#process">How It Works</a>
            <a href="#about">About</a>
            <a href="#reviews">Reviews</a>
            <a href="#faq">FAQs</a>
          </nav>

          <button className="menu-button" type="button" aria-label="Open navigation">
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">Mobile phlebotomy · Central New Jersey</p>
              <h1>Professional Blood Draws—In the Comfort of Your Home</h1>
              <p className="hero-text">Skip the waiting room. MRS Medical Services travels to your home, office, assisted living facility, or workplace for safe, convenient specimen collection.</p>

              <div className="hero-actions">
                <a className="button button-primary" href="#contact">Schedule a Visit</a>
                <a className="text-link" href="#services">View Services <span aria-hidden="true">→</span></a>
              </div>

              <div className="zip-check" aria-label="Service area check preview">
                <label htmlFor="zip">See if we serve your area</label>
                <div className="zip-row">
                  <input id="zip" inputMode="numeric" placeholder="Enter ZIP code" aria-label="ZIP code" />
                  <button type="button">Check availability</button>
                </div>
              </div>
            </div>

            <div className="hero-media" role="img" aria-label="A mobile phlebotomist providing an in-home blood draw">
              <div className="photo-badge"><span>✓</span> Certified &amp; insured</div>
            </div>
          </div>
        </section>

        <section className="trust-strip" aria-label="Why choose MRS Medical Services">
          <div className="container trust-grid">
            <article>
              <span className="trust-number">01</span>
              <div><strong>Convenient</strong><p>We come to you.</p></div>
            </article>
            <article>
              <span className="trust-number">02</span>
              <div><strong>Professional</strong><p>Certified and experienced.</p></div>
            </article>
            <article>
              <span className="trust-number">03</span>
              <div><strong>Comfortable</strong><p>Care in familiar surroundings.</p></div>
            </article>
          </div>
        </section>

        <section className="services-section" id="services">
          <div className="container">
            <div className="section-heading centered-heading">
              <p className="eyebrow">Services</p>
              <h2>Mobile phlebotomy for the people and places that need it</h2>
              <p>Professional specimen collection brought directly to your door.</p>
            </div>

            <div className="service-list">
              {services.map(([title, description], index) => (
                <article className="service-row" key={title}>
                  <ServiceIcon type={index} />
                  <div><h3>{title}</h3><p>{description}</p></div>
                  <span className="service-arrow" aria-hidden="true">↗</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="process-section" id="process">
          <div className="container process-layout">
            <div className="process-intro">
              <p className="eyebrow eyebrow-light">How it works</p>
              <h2>Simple from start to finish</h2>
              <p>We keep the process clear so you know what to expect before we arrive.</p>
              <a className="button button-light" href="#contact">Schedule a Visit</a>
            </div>

            <ol className="process-list">
              {steps.map(([number, title, description]) => (
                <li key={number}>
                  <span className="step-number">{number}</span>
                  <div><strong>{title}</strong><p>{description}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="container about-grid">
            <div className="about-photo" role="img" aria-label="Professional mobile phlebotomist preparing supplies" />
            <div className="about-copy">
              <p className="eyebrow">Care you can feel comfortable with</p>
              <h2>Professional service. Personal attention.</h2>
              <p>Inviting someone into your home for a medical service requires trust. MRS Medical Services approaches every visit with patience, respect, and careful attention to detail.</p>
              <ul className="check-list">
                <li><CheckIcon /> Certified and experienced phlebotomist</li>
                <li><CheckIcon /> Clean, professional equipment and setup</li>
                <li><CheckIcon /> Respectful care for every age and mobility level</li>
                <li><CheckIcon /> Clear communication before and during the visit</li>
              </ul>
              <a className="text-link" href="#contact">Learn about MRS Medical Services <span aria-hidden="true">→</span></a>
            </div>
          </div>
        </section>

        <section className="reviews-section" id="reviews">
          <div className="container reviews-grid">
            <div className="section-heading">
              <p className="eyebrow">Patient reviews</p>
              <h2>Kind words from people we’ve helped</h2>
            </div>
            <figure className="featured-review">
              <div className="stars" aria-label="Five stars">★★★★★</div>
              <blockquote>“Professional, gentle, and right on time. The whole appointment was easier than going to a lab, especially for my mother.”</blockquote>
              <figcaption>— Future verified patient review</figcaption>
            </figure>
          </div>
        </section>

        <section className="faq-section" id="faq">
          <div className="container faq-grid">
            <div>
              <p className="eyebrow">Common questions</p>
              <h2>Before your visit</h2>
              <p>Clear answers make the appointment easier.</p>
            </div>
            <div className="faq-list">
              {['Do I need a doctor’s order?', 'Do you accept insurance?', 'What should I have ready?', 'Who provides my test results?'].map((question) => (
                <details key={question}>
                  <summary>{question}<span aria-hidden="true">+</span></summary>
                  <p>Final answer will be added after the business policies and laboratory relationships are confirmed.</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="final-cta" id="contact">
          <div className="container final-cta-inner">
            <div><p className="eyebrow eyebrow-light">Ready when you are</p><h2>Let us bring the blood draw to you.</h2></div>
            <a className="button button-light" href="mailto:contact@mrsmedicalservices.com">Schedule a Visit</a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <a className="brand brand-light" href="#top"><span className="brand-mark"><span>M</span></span><span className="brand-copy"><strong>MRS</strong><small>Medical Services</small></span></a>
            <p>Professional mobile phlebotomy services delivered with care.</p>
          </div>
          <div><strong>Explore</strong><a href="#services">Services</a><a href="#process">How It Works</a><a href="#about">About</a><a href="#faq">FAQs</a></div>
          <div><strong>Contact</strong><a href="mailto:contact@mrsmedicalservices.com">contact@mrsmedicalservices.com</a><span>Central New Jersey</span><span>Hours to be confirmed</span></div>
        </div>
        <div className="container footer-bottom"><span>© 2026 MRS Medical Services</span><span>Privacy · Terms · Accessibility</span></div>
      </footer>
    </div>
  );
}
