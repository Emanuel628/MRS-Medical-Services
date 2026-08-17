import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './temporaryStripeCheckoutBlock';
import './styles/reset.css';
import './styles/variables.css';
import './styles/global.css';
import './styles/responsive.css';
import './styles/adjustments.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
