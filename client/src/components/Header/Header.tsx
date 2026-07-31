export default function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a className="brand" href="#top" aria-label="MRS Medical Services home">
          MRS Medical Services
        </a>
        <nav aria-label="Primary navigation">
          <a href="#services">Services</a>
          <a href="#process">How It Works</a>
          <a href="#about">About</a>
          <a href="#reviews">Reviews</a>
          <a href="#contact">Contact</a>
        </nav>
      </div>
    </header>
  );
}
