import Header from '../components/Header/Header';
import Hero from '../components/Hero/Hero';
import TrustBar from '../components/TrustBar/TrustBar';
import Services from '../components/Services/Services';
import Process from '../components/Process/Process';
import Credentials from '../components/Credentials/Credentials';
import Testimonials from '../components/Testimonials/Testimonials';
import FinalCTA from '../components/FinalCTA/FinalCTA';
import Footer from '../components/Footer/Footer';

export default function LandingPage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <TrustBar />
        <Services />
        <Process />
        <Credentials />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
