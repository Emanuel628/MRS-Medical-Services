export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <strong>MRS Medical Services</strong>
        <p>Mobile phlebotomy services. Final service area and contact information coming soon.</p>
        <small>© {new Date().getFullYear()} MRS Medical Services. All rights reserved.</small>
      </div>
    </footer>
  );
}
