// Shared navigation component
document.addEventListener('DOMContentLoaded', function() {
    const navHTML = `
        <nav aria-label="Primary navigation">
            <ul>
                <li class="nav-name">William Trottier</li>
                <li><a href="index.html">About Me</a></li>
                <li><a href="projects.html">Projects</a></li>
                <li><a href="experience_education.html">Experience & Education</a></li>
                <li><a href="William Trottier - Computer Science Resume.pdf" target="_blank" rel="noopener noreferrer">Resume</a></li>
            </ul>
        </nav>
        <hr class="nav-divider">
    `;
    
    // Insert navigation into the header
    const header = document.querySelector('header');
    if (header) {
        header.insertAdjacentHTML('afterbegin', navHTML);

        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = header.querySelectorAll('nav a');

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPath || (currentPath === '' && href === 'index.html')) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            }
        });
    }
});