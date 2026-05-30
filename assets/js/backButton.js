// backButton.js – reusable back button logic
// Attach to any button with class 'back-btn' and optional data-back attribute for fallback URL
document.addEventListener('DOMContentLoaded', () => {
  const backButtons = document.querySelectorAll('.back-btn');
  backButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const fallback = btn.getAttribute('data-back');
      if (document.referrer && document.referrer !== window.location.href) {
        // Use history.back if possible
        window.history.back();
      } else if (fallback) {
        window.location.href = fallback;
      } else {
        // Default to dashboard
        window.location.href = 'dashboard.html';
      }
    });
  });
});
