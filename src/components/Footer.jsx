import React from 'react';
import '../styles/Footer.css';
import Logo from '../assets/Logo.png';

const Footer = () => {
 // console.log("Footer component rendering"); // Add debug logging
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-left">
          <div className="footer-logo">
            <img src={Logo} alt="PoPaaS Logo" className="footer-logo-img" />
            <span>PoPaaS</span>
          </div>
          <p className="copyright">© {new Date().getFullYear()} PoPaaS. All rights reserved.</p>
        </div>
        
        <div className="footer-links-container">
          <div className="footer-links-group">
            <a href="/docs" className="footer-link">Documentation</a>
            <a href="/privacy" className="footer-link">Privacy</a>
            <a href="/sdk" className="footer-link">SDK</a>
          </div>
          
          <div className="footer-social">
            <a href="mailto:info@popaas.io" className="footer-social-icon" aria-label="Email">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href="https://twitter.com/popaas" className="footer-social-icon" aria-label="Twitter">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23 3C22.0424 3.67548 20.9821 4.19211 19.86 4.53C19.2577 3.83751 18.4573 3.34669 17.567 3.12393C16.6767 2.90116 15.7395 2.95724 14.8821 3.28445C14.0247 3.61166 13.2884 4.1944 12.773 4.95372C12.2575 5.71305 11.9877 6.61234 12 7.53V8.53C10.2426 8.57557 8.50127 8.18581 6.93101 7.39545C5.36074 6.60508 4.01032 5.43864 3 4C3 4 -1 13 8 17C5.94053 18.398 3.48716 19.0989 1 19C10 24 21 19 21 7.5C20.9991 7.22145 20.9723 6.94359 20.92 6.67C21.9406 5.66349 22.6608 4.39271 23 3V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href="https://github.com/popaas" className="footer-social-icon" aria-label="GitHub">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 19C4 20.5 4 16.5 2 16M16 22V18.13C16.0375 17.6532 15.9731 17.1738 15.811 16.7238C15.6489 16.2738 15.3929 15.8634 15.06 15.52C18.2 15.17 21.5 13.98 21.5 8.52C21.4997 7.12383 20.9627 5.7812 20 4.77C20.4559 3.54851 20.4236 2.19835 19.91 0.999999C19.91 0.999999 18.73 0.649999 16 2.48C13.708 1.85882 11.292 1.85882 9 2.48C6.27 0.649999 5.09 0.999999 5.09 0.999999C4.57638 2.19835 4.54414 3.54851 5 4.77C4.03013 5.7887 3.49252 7.14346 3.5 8.55C3.5 13.97 6.8 15.16 9.94 15.55C9.61 15.89 9.35631 16.2954 9.19 16.74C9.02369 17.1846 8.95345 17.6559 8.99 18.13V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
