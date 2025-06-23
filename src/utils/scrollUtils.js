/**
 * Utility functions for smooth scrolling and animations
 */

/**
 * Adds smooth scrolling behavior to all anchor links
 */
export const initSmoothScrolling = () => {
  // Select all links with hash (#) in the href
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Get the target element
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        // Calculate offset to account for fixed navbar
        const navbarHeight = document.querySelector('.navbar').offsetHeight;
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = targetPosition - navbarHeight - 20; // Extra 20px for spacing
        
        // Smooth scroll to the target
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
};

/**
 * Handles section transition animations on scroll
 */
export const initScrollAnimations = () => {
  const animateOnScroll = () => {
    const sections = document.querySelectorAll('.animate-section');
    
    sections.forEach(section => {
      const sectionTop = section.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;
      
      // When section is in viewport (with offset)
      if (sectionTop < windowHeight * 0.85) {
        section.classList.add('animated');
      }
    });
  };
  
  // Initial check for elements in viewport
  animateOnScroll();
  
  // Add scroll event listener
  window.addEventListener('scroll', animateOnScroll);
};
