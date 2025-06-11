document.addEventListener('DOMContentLoaded', () => {
  fetch('/api/user', { credentials: 'include' })
    .then(res => {
      if (res.ok) return res.json();
      throw new Error('Not logged in');
    })
    .then(user => {
      const userInfoDiv = document.getElementById('user-info');
      const userButton = document.getElementById('user-button');
      const userMenu = document.getElementById('user-menu');

      // Show user info div
      userInfoDiv.style.display = 'block';

      // Set username and id on button
      userButton.textContent = `${user.username}#${user.discriminator} (${user.id})`;

      // Toggle dropdown menu on button click
      userButton.addEventListener('click', () => {
        if (userMenu.style.display === 'block') {
          userMenu.style.display = 'none';
        } else {
          userMenu.style.display = 'block';
        }
      });

      // Close dropdown if clicked outside
      window.addEventListener('click', (e) => {
        if (!userInfoDiv.contains(e.target)) {
          userMenu.style.display = 'none';
        }
      });

      // Logout link (redirects to /logout)
      document.getElementById('logout').addEventListener('click', (e) => {
        // just let it follow the href, or you can fetch logout API for SPA
      });

      // View profile (you can implement the profile page later)
      document.getElementById('view-profile').addEventListener('click', (e) => {
        // Optionally add custom logic here if needed
      });
    })
    .catch(() => {
      // User not logged in, hide user info area if exists
      document.getElementById('user-info').style.display = 'none';
    });
});
