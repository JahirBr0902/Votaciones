const Auth = {
    apiBase: '../app/api/api.php',
    
    init() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    },

    async handleLogin(e) {
        e.preventDefault(); // Detener la recarga de la página y el envío por URL
        
        const btn = document.getElementById('btn-login');
        const msg = document.getElementById('login-message');
        const formData = new FormData(e.target);
        
        // Asegurar que la acción se mande por POST
        formData.append('action', 'login');

        if (btn) btn.disabled = true;
        if (msg) msg.textContent = 'Autenticando...';

        try {
            const res = await fetch(this.apiBase, {
                method: 'POST',
                body: formData // Los datos viajan ocultos en el cuerpo del mensaje
            });
            const result = await res.json();

            if (result.success) {
                window.location.href = 'dashboard.php';
            } else {
                if (msg) msg.textContent = result.message;
                if (btn) btn.disabled = false;
            }
        } catch (err) {
            if (msg) msg.textContent = 'Error de comunicación con el servidor.';
            if (btn) btn.disabled = false;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => Auth.init());
