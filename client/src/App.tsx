import { useEffect, useState, type FormEvent, type ReactNode } from 'react';

type PageKey = 'home' | 'services' | 'about' | 'contact';

const navItems: Array<{ key: PageKey; label: string; path: string }> = [
  { key: 'home', label: 'Home', path: '/' },
  { key: 'services', label: 'Services', path: '/services' },
  { key: 'about', label: 'About', path: '/about' },
  { key: 'contact', label: 'Contact', path: '/contact' },
];

const serviceItems = [
  'Routine blood draws',
  'Specialty kit collections',
  'Standing orders',
  'Wellness collections',
  'Employer or group collections',
  'Assisted living or facility visits',
];

const labOptions = ['LabCorp', 'Quest', 'Oxford', 'Vibrant America', 'Boston Heart', 'SpectraCell'];

const steps = [
  ['1', 'Request a visit', 'Share the basic details and location so the visit can be reviewed.'],
  ['2', 'Confirm the order', 'Have the required lab order, kit, or collection instructions ready.'],
  ['3', 'Collection visit', 'A mobile phlebotomy visit is completed at the approved location.'],
  ['4', 'Specimen handoff', 'Specimens are handled according to the order, kit, or lab instructions.'],
];

function pageFromPath(pathname: string): PageKey {
  if (pathname.startsWith('/services')) return 'services';
  if (pathname.startsWith('/about')) return 'about';
  if (pathname.startsWith('/contact')) return 'contact';
  return 'home';
}

function Header({ activePage, onNavigate }: { activePage: PageKey; onNavigate: (page: PageKey) => void }) {
  return (
    <header className="header">
      <div className="wrap header-inner">
        <a
          className="logo"
          href="/"
          aria-label="M.R.S. Medical Services home"
          onClick={(event) => {
            event.preventDefault();
            onNavigate('home');
          }}
        >
          <span className="brand-wordmark">
            <strong>M.R.S.</strong>
            <span>Medical Services</span>
          </span>
        </a>

        <nav aria-label="Primary navigation">
          {navItems.map((item) => (
            <a
              key={item.key}
              href={item.path}
              aria-current={activePage === item.key ? 'page' : undefined}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(item.key);
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Footer({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <div>
          <strong>M.R.S. Medical Services</strong>
          <p>Mobile phlebotomy services for convenient specimen collection.</p>
        </div>
        <nav aria-label="Footer navigation">
          {navItems.map((item) => (
            <a
              key={item.key}
              href={item.path}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(item.key);
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}

function HomePage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  return (
    <main id="top">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Mobile phlebotomy</span>
          <h1>Professional blood draws in the comfort of your space.</h1>
          <p>
            M.R.S. Medical Services provides mobile specimen collection for people who need a
            simpler way to complete blood work without sitting in a waiting room.
          </p>
          <div className="hero-buttons">
            <button className="btn primary" type="button" onClick={() => onNavigate('contact')}>
              Request a Visit
            </button>
            <a className="btn secondary" href="tel:+19084637457">Call Now</a>
          </div>
        </div>
      </section>

      <section className="benefits">
        <div className="wrap benefits-grid">
          <article>
            <strong>Convenient</strong>
            <p>Service is planned around an approved home, office, or facility visit.</p>
          </article>
          <article>
            <strong>Clear pricing</strong>
            <p>Normal blood draws are $80, with additional kit or provider-order fees when needed.</p>
          </article>
          <article>
            <strong>Simple</strong>
            <p>All you need to start is a prescription, lab order, or collection kit instructions.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div className="section-title">
            <span>How it works</span>
            <h2>A straightforward collection visit.</h2>
            <i />
          </div>
          <div className="steps">
            {steps.map(([number, title, description]) => (
              <article key={number}>
                <b>{number}</b>
                <strong>{title}</strong>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="wrap cta-inner">
          <div>
            <h3>Need a mobile blood draw?</h3>
            <p>Send a message with your location, timing, and collection needs.</p>
          </div>
          <button className="btn teal" type="button" onClick={() => onNavigate('contact')}>
            Contact M.R.S.
          </button>
        </div>
      </section>
    </main>
  );
}

function ServicesPage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  return (
    <main>
      <PageHero eyebrow="Services" title="Mobile blood collection made simple.">
        <p>
          The services below are the core collection categories visitors commonly need. Final
          eligibility, service area, timing, and order requirements should be confirmed before a
          visit is scheduled.
        </p>
      </PageHero>

      <section className="section">
        <div className="wrap services-layout">
          <div className="section-title">
            <span>What we collect</span>
            <h2>Common mobile phlebotomy needs.</h2>
            <i />
          </div>
          <ul className="service-list">
            {serviceItems.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section muted">
        <div className="wrap info-grid">
          <article>
            <span className="eyebrow">Pricing</span>
            <h2>Simple visit fees.</h2>
            <p>
              Normal blood draws are $80. Additional kits or orders from a different doctor or
              provider are $20 each.
            </p>
            <p>
              The mobile collection fee is separate from any laboratory testing charges, insurance
              billing, or provider fees.
            </p>
          </article>
          <article>
            <span className="eyebrow">Requirements</span>
            <h2>Prescription required.</h2>
            <p>
              A prescription, lab order, or collection kit instructions are required before a blood
              draw can be completed.
            </p>
            <p>Appointments require 24-hour notice for cancellation.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="wrap services-layout">
          <div className="section-title">
            <span>Labs and kits</span>
            <h2>Collection support for common lab orders.</h2>
            <i />
          </div>
          <ul className="service-list">
            {labOptions.map((lab) => (
              <li key={lab}>{lab}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section muted">
        <div className="wrap content-block">
          <h2>Before requesting a visit</h2>
          <p>
            Please have any lab order, kit, provider instructions, or collection paperwork ready.
            M.R.S. Medical Services does not diagnose conditions, interpret lab results, or replace
            medical advice from your provider.
          </p>
          <button className="btn primary" type="button" onClick={() => onNavigate('contact')}>
            Ask About Service
          </button>
        </div>
      </section>
    </main>
  );
}

function AboutPage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  return (
    <main>
      <PageHero eyebrow="About" title="Personal, professional mobile collection.">
        <p>
          M.R.S. Medical Services is built around a simple idea: make specimen collection easier for
          people who need convenient access outside a traditional waiting room.
        </p>
      </PageHero>

      <section className="section">
        <div className="wrap about-layout">
          <div className="content-block">
            <h2>Care without clutter</h2>
            <p>
              The service is intentionally focused: confirm the collection need, schedule an
              appropriate visit, complete the blood draw, and follow the handling instructions for
              the specimen.
            </p>
            <p>
              Service hours are Monday through Friday, 6 AM to 2 PM. Appointments require 24-hour
              notice for cancellation.
            </p>
          </div>
          <div className="about-note">
            <strong>Content standard</strong>
            <p>
              This site avoids unverified claims, fabricated reviews, and unsupported healthcare
              promises. That keeps the message simple and trustworthy.
            </p>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="wrap cta-inner">
          <div>
            <h3>Questions before scheduling?</h3>
            <p>Use the contact page to share what you need and where the visit would take place.</p>
          </div>
          <button className="btn teal" type="button" onClick={() => onNavigate('contact')}>
            Contact Us
          </button>
        </div>
      </section>
    </main>
  );
}

function ContactPage() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('sending');
    setStatusMessage('Sending your message...');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || 'Message could not be sent right now.');
      }

      setForm({ name: '', phone: '', email: '', message: '' });
      setStatus('success');
      setStatusMessage('Your message was sent. M.R.S. Medical Services will follow up soon.');
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Message could not be sent right now.');
    }
  };

  return (
    <main>
      <PageHero eyebrow="Contact" title="Send a message about your visit.">
        <p>
          Share the basic details and M.R.S. Medical Services can follow up about service area,
          scheduling, and what paperwork or instructions are needed.
        </p>
      </PageHero>

      <section className="section">
        <div className="wrap contact-layout">
          <form className="contact-form" onSubmit={handleSubmit}>
            <label>
              Name
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                autoComplete="name"
                required
              />
            </label>
            <label>
              Phone
              <input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                autoComplete="tel"
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                autoComplete="email"
              />
            </label>
            <label>
              Message
              <textarea
                rows={6}
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                placeholder="Tell us what type of collection you need, your general location, and preferred timing."
                required
              />
            </label>
            <button className="btn primary" type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending...' : 'Send Message'}
            </button>
            {statusMessage && (
              <p className={`form-status ${status === 'error' ? 'form-status-error' : ''}`} role="status">
                {statusMessage}
              </p>
            )}
          </form>

          <aside className="contact-card">
            <h2>Contact details</h2>
            <p><strong>Phone:</strong> <a href="tel:+19084637457">(908) 463-7457</a></p>
            <p><strong>Email:</strong> <a href="mailto:dirving.mrsms@gmail.com">dirving.mrsms@gmail.com</a></p>
            <p><strong>Hours:</strong> Monday-Friday, 6 AM-2 PM</p>
            <p><strong>Pricing:</strong> Normal draws are $80. Additional kits or different provider orders are $20 each.</p>
            <p><strong>Cancellation:</strong> Please provide 24-hour notice.</p>
            <p>
              Do not include sensitive medical information in the first message. Basic scheduling
              details are enough to start the conversation.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}

function PageHero({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="page-hero">
      <div className="wrap">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {children}
      </div>
    </section>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState<PageKey>(() => pageFromPath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setActivePage(pageFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (page: PageKey) => {
    const item = navItems.find((navItem) => navItem.key === page);
    if (!item) return;
    window.history.pushState(null, '', item.path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActivePage(page);
  };

  return (
    <div className="page">
      <Header activePage={activePage} onNavigate={navigate} />
      {activePage === 'home' && <HomePage onNavigate={navigate} />}
      {activePage === 'services' && <ServicesPage onNavigate={navigate} />}
      {activePage === 'about' && <AboutPage onNavigate={navigate} />}
      {activePage === 'contact' && <ContactPage />}
      <Footer onNavigate={navigate} />
    </div>
  );
}
