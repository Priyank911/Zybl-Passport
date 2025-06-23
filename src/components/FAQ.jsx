import React, { useState } from 'react';
import '../styles/FAQ.css';

const faqItems = [
  {
    id: 1,
    question: "What is PoPaaS and how does it work?",
    answer: "PoPaaS (Proof of Personhood as a Service) is a cross-chain identity infrastructure that verifies real human users through biometric AI verification, behavioral analysis, and on-chain wallet analysis. It assigns each user a dynamic Zybl Score (0-100) and provides non-transferable identity credentials that can be reused across dApps."
  },
  {
    id: 2,
    question: "How does PoPaaS ensure privacy while verifying identity?",
    answer: "PoPaaS uses privacy-preserving technologies like ZK-DIDs (Zero-Knowledge Decentralized Identifiers) to verify human identity without exposing sensitive information. The system combines biometric verification with behavioral patterns while maintaining user privacy through advanced cryptographic techniques."
  },
  {
    id: 3,
    question: "Which blockchains does PoPaaS support?",
    answer: "PoPaaS is chain-agnostic and currently supports Ethereum, Optimism, Base, Solana, and Bitcoin. The platform uses privacy-preserving identifiers to link multiple wallets to a single human identity across different chains, making it truly cross-chain compatible."
  },
  {
    id: 4,
    question: "How does the revenue sharing model work?",
    answer: "PoPaaS uses x402pay for monetization through a pay-per-check model. Revenue is automatically split and disbursed among key contributors including node runners, developers, and protocol treasuries through CDP Wallet integration. This creates a sustainable ecosystem where all participants are incentivized."
  },
  {
    id: 5,
    question: "How easy is it to integrate PoPaaS into my dApp?",
    answer: "Integration is straightforward with our lightweight JS/TS SDK. Developers can implement human verification with a simple verifyHuman(wallet) function, enabling human-gated access within minutes. The SDK handles all the complexity of verification, scoring, and credential management."
  },
  {
    id: 6,
    question: "What can I use PoPaaS for?",
    answer: "PoPaaS is ideal for any Web3 application that needs to verify real human users, including airdrops, DAOs, gaming platforms, and reward systems. It helps prevent Sybil attacks while maintaining privacy and can be used to gate access to specific features or rewards based on the user's Zybl Score."
  }
];

const FAQ = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleAccordion = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (    <section className="faq-section animate-section" id="faq">
      <div className="faq-container">
        <div className="faq-header">
          <h2 className="faq-title">Frequently Asked Questions</h2>
          <p className="faq-subtitle">
            Find answers to common questions about PoPaaS identity verification
          </p>        </div>

        <div className="faq-accordion">
          {faqItems.map((item, index) => (
            <div 
              key={item.id} 
              className={`faq-item animate-item ${activeIndex === index ? 'active' : ''}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <button 
                className="faq-question"
                onClick={() => toggleAccordion(index)}
                aria-expanded={activeIndex === index}
              >
                {item.question}
                <span className="faq-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </button>
              <div className="faq-answer">
                <p>{item.answer}</p>
              </div>
            </div>
          ))}        </div>

        <div className="faq-more animate-item" style={{ animationDelay: '0.6s' }}>
          <p>Ready to integrate PoPaaS into your dApp?</p>
          <a href="/developers" className="faq-contact-button">Get Started</a>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
