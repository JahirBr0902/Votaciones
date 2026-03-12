const Admin = {
    apiBase: '../app/api/api.php',

    init() {
        this.loadStatus();
        this.loadPeriodResults();
        this.loadAdminEmployees();
        this.bindEvents();
    },

    bindEvents() {
        const addForm = document.getElementById('add-employee-form');
        if (addForm) {
            addForm.addEventListener('submit', (e) => this.addEmployee(e));
        }
    },

    getCompanyName(slug) {
        const names = {
            'Witmac': 'Witmac',
            'RyP': 'Recargalos y Pagalos'
        };
        return names[slug] || slug;
    },

    async loadStatus() {
        try {
            const res = await fetch(`${this.apiBase}?action=get_voting_status`);
            const data = await res.json();
            
            if (data.message === 'No autorizado') {
                window.location.href = './';
                return;
            }

            if (data.success) {
                const toggle = document.getElementById('voting-toggle');
                const statusText = document.getElementById('status-text');
                if (toggle) toggle.checked = data.active;
                if (statusText) statusText.textContent = data.active ? 'ACTIVO' : 'INACTIVO';
            }

            const resTime = await fetch(`${this.apiBase}?action=get_voting_end_time`);
            const dataTime = await resTime.json();
            if (dataTime.success) {
                const timeInput = document.getElementById('voting-end-time');
                if (timeInput) timeInput.value = dataTime.end_time;
            }

            const resWinner = await fetch(`${this.apiBase}?action=get_show_winner`);
            const dataWinner = await resWinner.json();
            if (dataWinner.success) {
                const winnerToggle = document.getElementById('winner-toggle');
                const winnerText = document.getElementById('winner-status-text');
                if (winnerToggle) winnerToggle.checked = dataWinner.show_winner;
                if (winnerText) winnerText.textContent = dataWinner.show_winner ? 'VISIBLE' : 'OCULTO';
            }
        } catch (e) {
            console.error("Error al cargar estado");
        }
    },

    async toggleVoting(active) {
        const res = await fetch(this.apiBase, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_voting', active })
        });
        const data = await res.json();
        if (data.success) {
            const statusText = document.getElementById('status-text');
            if (statusText) statusText.textContent = active ? 'ACTIVO' : 'INACTIVO';
            
            // Actualizar también el anuncio de ganador visualmente si se apagó
            const winnerToggle = document.getElementById('winner-toggle');
            const winnerText = document.getElementById('winner-status-text');
            if (active && winnerToggle) {
                winnerToggle.checked = false;
                if (winnerText) winnerText.textContent = 'OCULTO';
            }

            App.showToast(`Votación ${active ? 'activada' : 'desactivada'}`, false);
        }
    },

    async toggleShowWinner(active) {
        const res = await fetch(this.apiBase, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_show_winner', active })
        });
        const data = await res.json();
        if (data.success) {
            const winnerText = document.getElementById('winner-status-text');
            if (winnerText) winnerText.textContent = active ? 'VISIBLE' : 'OCULTO';
            App.showToast(`Anuncio de ganador ${active ? 'activado' : 'desactivado'}`, false);
        }
    },

    async saveEndTime() {
        const endTime = document.getElementById('voting-end-time').value;
        const res = await fetch(this.apiBase, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set_voting_end_time', end_time: endTime })
        });
        const data = await res.json();
        if (data.success) {
            App.showToast("Tiempo de cierre guardado", false);
            this.loadStatus(); 
        }
    },

    async clearEndTime() {
        const timeInput = document.getElementById('voting-end-time');
        if (timeInput) timeInput.value = '';
        this.saveEndTime();
    },

    async loadPeriodResults() {
        const month = document.getElementById('filter-month').value;
        const year = document.getElementById('filter-year').value;
        const periodLabel = document.getElementById('period-label');
        if (periodLabel) periodLabel.textContent = `${month}/${year}`;

        try {
            const res = await fetch(`${this.apiBase}?action=get_results&month=${month}&year=${year}`);
            const data = await res.json();
            if (data.success) {
                this.renderAdminResults(data.results, data.total);
            }
        } catch (e) {
            App.showToast("Error al cargar resultados", true);
        }
    },

    renderAdminResults(results, total) {
        const statsBar = document.getElementById('stats-bar');
        if (statsBar) statsBar.style.display = 'flex';
        
        const totalVotesEl = document.getElementById('total-votes');
        if (totalVotesEl) totalVotesEl.textContent = total;

        const container = document.getElementById('results-container');
        if (!container) return;
        
        container.innerHTML = '';
        const list = document.createElement('div');
        list.className = 'results-list';

        let lastCompany = "";
        results.forEach((r, i) => {
            if (r.company !== lastCompany) {
                const sep = document.createElement('div');
                sep.style = "background: var(--ink); color: white; padding: 0.5rem 1rem; font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.1em; margin-top: 2rem;";
                sep.textContent = `EMPRESA: ${this.getCompanyName(r.company)}`;
                list.appendChild(sep);
                lastCompany = r.company;
            }

            const row = document.createElement('div');
            row.className = `result-row animate-in rank-${r.rank}`;
            row.innerHTML = `
                <div class="progress-bg" style="background:${App.getBarColor(r.rank)}; width: ${r.percentage}%"></div>
                <div class="rank-badge">${r.rank}</div>
                <div class="candidate-info">
                    <div class="candidate-alias">${r.name || r.alias}</div>
                    <div class="candidate-dept">${r.department}</div>
                </div>
                <div class="vote-display">
                    <div class="percentage">${r.percentage}%</div>
                    <div class="vote-count">${r.votes} votos</div>
                </div>
            `;
            list.appendChild(row);
        });
        container.appendChild(list);
    },

    async resetVotes() {
        const month = document.getElementById('filter-month').value;
        const year = document.getElementById('filter-year').value;
        
        const result = await Swal.fire({
            title: '¿Confirmar reinicio?',
            text: `Se eliminarán permanentemente los votos de ${month}/${year}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, reiniciar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;
        
        const res = await fetch(this.apiBase, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reset', month: month, year: year })
        });
        const data = await res.json();
        if (data.success) {
            this.loadPeriodResults();
            Swal.fire('Reiniciado', 'El periodo ha sido limpiado.', 'success');
        }
    },

    async confirmLogout() {
        const result = await Swal.fire({
            title: '¿Cerrar sesión?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1e3a8a',
            confirmButtonText: 'Salir',
            cancelButtonText: 'Permanecer'
        });

        if (result.isConfirmed) {
            await fetch(`${this.apiBase}?action=logout`);
            window.location.href = './';
        }
    },

    async loadAdminEmployees() {
        try {
            const res = await fetch(`${this.apiBase}?action=get_employees`);
            const data = await res.json();
            if (data.success) {
                const container = document.getElementById('admin-employees-list');
                container.innerHTML = `
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                        <thead>
                            <tr style="text-align: left; border-bottom: 2px solid var(--border);">
                                <th style="padding: 1rem;">Foto</th>
                                <th style="padding: 1rem;">Nombre</th>
                                <th style="padding: 1rem;">Empresa</th>
                                <th style="padding: 1rem;">Departamento</th>
                                <th style="padding: 1rem; text-align: right;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="admin-table-body"></tbody>
                    </table>
                `;
                const tbody = document.getElementById('admin-table-body');
                data.employees.forEach(emp => {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid var(--border)';
                    tr.innerHTML = `
                        <td style="padding: 0.5rem 1rem;">
                            <div class="avatar-img" style="width: 40px; height: 40px; margin: 0; background-image: url('../${emp.image_path}')"></div>
                        </td>
                        <td style="padding: 1rem;"><strong>${emp.name}</strong></td>
                        <td style="padding: 1rem;"><span style="background: var(--accent-pale); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem;">${this.getCompanyName(emp.company)}</span></td>
                        <td style="padding: 1rem; color: var(--muted);">${emp.department}</td>
                        <td style="padding: 1rem; text-align: right;">
                            <button onclick="Admin.deleteEmployee(${emp.id}, '${emp.name}')" style="background:none; border:none; color:var(--crimson); cursor:pointer; font-size: 0.7rem; text-transform:uppercase; letter-spacing:0.1em;">Eliminar</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        } catch (e) {
            console.error("Error al cargar empleados");
        }
    },

    async addEmployee(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
            const res = await fetch(this.apiBase, {
                method: 'POST',
                body: formData
            });
            
            const data = await res.json();
            if (data.success) {
                e.target.reset();
                this.loadAdminEmployees();
                App.showToast("Empleado agregado con éxito", false);
            } else {
                App.showToast(data.message || "Error al agregar", true);
            }
        } catch (e) {
            App.showToast("Error de conexión al servidor", true);
        }
    },

    async deleteEmployee(id, name) {
        const result = await Swal.fire({
            title: '¿Eliminar empleado?',
            text: `Se desactivará a ${name}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(this.apiBase, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'delete_employee', id })
                });
                const data = await res.json();
                if (data.success) {
                    this.loadAdminEmployees();
                    App.showToast("Empleado eliminado", false);
                }
            } catch (e) {
                App.showToast("Error al eliminar", true);
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => Admin.init());
