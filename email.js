document.getElementById('email-button').addEventListener('click', function(e) {
    e.preventDefault();
    const email = 'williamt1117@gmail.com';
    navigator.clipboard.writeText(email).then(() => {
        const originalText = this.innerHTML;
        this.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
            this.innerHTML = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy email:', err);
    });
});
