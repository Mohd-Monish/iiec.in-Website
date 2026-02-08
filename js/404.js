/**
 * 404 Page - Floating Icons Generator
 */
(function() {
  'use strict';
  
  const container = document.getElementById('floating-icons');
  if (!container) return;
  
  const icons = [
    // Lightbulb
    '<svg viewBox="0 0 24 24"><path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7z"/></svg>',
    // Rocket
    '<svg viewBox="0 0 24 24"><path d="M12 2.5s4.5 2.04 4.5 10.5c0 2.49-1.04 5.57-1.6 7H9.1c-.56-1.43-1.6-4.51-1.6-7C7.5 4.54 12 2.5 12 2.5zm0 5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM7 22h10v-2H7v2z"/></svg>',
    // Target
    '<svg viewBox="0 0 24 24"><path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3-8c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z"/></svg>',
    // Chart
    '<svg viewBox="0 0 24 24"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/></svg>',
    // Handshake
    '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>'
  ];
  const numberOfIcons = 12;
  
  for (let i = 0; i < numberOfIcons; i++) {
    const icon = document.createElement('div');
    icon.className = 'float-icon';
    icon.innerHTML = icons[Math.floor(Math.random() * icons.length)];
    icon.style.left = Math.random() * 100 + '%';
    icon.style.top = Math.random() * 100 + '%';
    icon.style.animationDelay = Math.random() * 4 + 's';
    icon.style.animationDuration = (Math.random() * 3 + 3) + 's';
    container.appendChild(icon);
  }
})();
