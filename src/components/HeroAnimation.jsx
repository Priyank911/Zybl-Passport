/* filepath: d:\Coinbase\zybl-app\src\components\HeroAnimation.jsx */
import React, { useEffect } from 'react';
import '../styles/HeroAnimation.css';

const HeroAnimation = () => {
  useEffect(() => {
    // Create animated elements
    const createParticles = () => {
      const animationContainer = document.querySelector('.animation-container');
      if (!animationContainer) return;
      
      // Clear existing particles
      animationContainer.innerHTML = '';
      
      // Create new particles
      for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        // Random position
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        
        // Random size
        const size = Math.random() * 4 + 1;
        
        // Random opacity
        const opacity = Math.random() * 0.5 + 0.1;
        
        // Random animation duration
        const duration = Math.random() * 20 + 10;
        
        // Set styles
        particle.style.left = `${posX}%`;
        particle.style.top = `${posY}%`;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.opacity = opacity;
        particle.style.animationDuration = `${duration}s`;
        
        animationContainer.appendChild(particle);
      }
    };
    
    createParticles();
    
    // Recreate particles on window resize
    window.addEventListener('resize', createParticles);
    
    return () => {
      window.removeEventListener('resize', createParticles);
    };
  }, []);

  return (
    <div className="animation-container"></div>
  );
};

export default HeroAnimation;
