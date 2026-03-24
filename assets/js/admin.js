const Admin = {
    apiBase: '../app/api/api.php',

    init() {
        this.loadStatus();
        this.loadNgrokStatus();
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
            row.style.cursor = 'pointer';
            row.onclick = () => this.viewReasons(r.id, r.name || r.alias);
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
                    <div style="font-size: 0.5rem; text-decoration: underline; color: var(--muted); margin-top: 0.2rem;">Ver motivos</div>
                </div>
            `;
            list.appendChild(row);
        });
        container.appendChild(list);
    },

    async viewReasons(employeeId = null, name = "Todos") {
        try {
            const url = employeeId 
                ? `${this.apiBase}?action=get_reasons&employee_id=${employeeId}`
                : `${this.apiBase}?action=get_reasons`;
            
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.success) {
                if (data.reasons.length === 0) {
                    Swal.fire('Sin motivos', 'No hay motivos registrados para este periodo.', 'info');
                    return;
                }

                let html = `
                    <div style="text-align: left; max-height: 400px; overflow-y: auto; padding: 1rem;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                            <thead>
                                <tr style="border-bottom: 2px solid var(--border);">
                                    <th style="padding: 0.5rem; text-align: left;">Candidato</th>
                                    <th style="padding: 0.5rem; text-align: left;">Motivo</th>
                                    <th style="padding: 0.5rem; text-align: right;">Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                data.reasons.forEach(r => {
                    const date = new Date(r.voted_at).toLocaleDateString();
                    html += `
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 0.5rem; vertical-align: top;"><strong>${r.candidate}</strong></td>
                            <td style="padding: 0.5rem; color: var(--ink); line-height: 1.4;">${r.reason}</td>
                            <td style="padding: 0.5rem; text-align: right; font-size: 0.65rem; color: var(--muted);">${date}</td>
                        </tr>
                    `;
                });

                html += `</tbody></table></div>`;

                Swal.fire({
                    title: `Motivos de Elección: ${name}`,
                    html: html,
                    width: '800px',
                    confirmButtonColor: '#1e3a8a',
                    confirmButtonText: 'Cerrar'
                });
            }
        } catch (e) {
            App.showToast("Error al cargar motivos", true);
        }
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
                        <td style="padding: 1rem; text-align: right; display: flex; gap: 0.5rem; justify-content: flex-end;">
                            <button onclick="Admin.editEmployee(${emp.id})" style="background:none; border:none; color:var(--accent); cursor:pointer; font-size: 0.7rem; text-transform:uppercase; letter-spacing:0.1em;">Editar</button>
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

    async editEmployee(id) {
        try {
            const res = await fetch(`${this.apiBase}?action=get_employee&id=${id}`);
            const data = await res.json();
            
            if (data.success) {
                const emp = data.employee;
                const { value: formValues } = await Swal.fire({
                    title: 'Editar Candidato',
                    html: `
                        <div style="text-align: left;">
                            <label style="font-size: 0.7rem; color: var(--muted); display: block; margin-bottom: 0.2rem;">Nombre Completo</label>
                            <input id="swal-name" class="swal2-input" style="margin: 0 0 1rem 0; width: 100%; box-sizing: border-box;" value="${emp.name}">
                            
                            <label style="font-size: 0.7rem; color: var(--muted); display: block; margin-bottom: 0.2rem;">Empresa</label>
                            <select id="swal-company" class="swal2-input" style="margin: 0 0 1rem 0; width: 100%; box-sizing: border-box;">
                                <option value="Witmac" ${emp.company === 'Witmac' ? 'selected' : ''}>Witmac</option>
                                <option value="RyP" ${emp.company === 'RyP' ? 'selected' : ''}>Recargalos y Pagalos</option>
                            </select>
                            
                            <label style="font-size: 0.7rem; color: var(--muted); display: block; margin-bottom: 0.2rem;">Departamento</label>
                            <input id="swal-dept" class="swal2-input" style="margin: 0 0 1rem 0; width: 100%; box-sizing: border-box;" value="${emp.department}">
                            
                            <label style="font-size: 0.7rem; color: var(--muted); display: block; margin-bottom: 0.2rem;">Nueva Foto (opcional)</label>
                            <input id="swal-image" type="file" class="swal2-file" style="margin: 0; width: 100%;" accept="image/*">
                        </div>
                    `,
                    focusConfirm: false,
                    showCancelButton: true,
                    confirmButtonText: 'Guardar Cambios',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#1e3a8a',
                    preConfirm: () => {
                        return {
                            id: id,
                            name: document.getElementById('swal-name').value,
                            company: document.getElementById('swal-company').value,
                            department: document.getElementById('swal-dept').value,
                            image: document.getElementById('swal-image').files[0]
                        }
                    }
                });

                if (formValues) {
                    this.updateEmployee(formValues);
                }
            }
        } catch (e) {
            App.showToast("Error al cargar datos del empleado", true);
        }
    },

    async updateEmployee(values) {
        const formData = new FormData();
        formData.append('action', 'update_employee');
        formData.append('id', values.id);
        formData.append('name', values.name);
        formData.append('company', values.company);
        formData.append('department', values.department);
        if (values.image) {
            formData.append('image', values.image);
        }

        try {
            const res = await fetch(this.apiBase, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                this.loadAdminEmployees();
                this.loadPeriodResults(); // Actualizar resultados también si cambió el nombre
                App.showToast("Empleado actualizado", false);
            } else {
                App.showToast(data.message || "Error al actualizar", true);
            }
        } catch (e) {
            App.showToast("Error de conexión", true);
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
    },

    // NGROK METHODS
    async startNgrok() {
        const btn = document.getElementById('btn-start-ngrok');
        const urlInput = document.getElementById('ngrok-url');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Iniciando...';
        }
        if (urlInput) urlInput.placeholder = 'Conectando con ngrok...';

        try {
            const res = await fetch(this.apiBase, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'start_ngrok' })
            });
            const data = await res.json();
            if (data.success) {
                if (urlInput) urlInput.value = data.url;
                App.showToast("Túnel iniciado correctamente", false);
            } else {
                App.showToast(data.message, true);
                if (urlInput) urlInput.placeholder = 'Error al iniciar';
            }
        } catch (e) {
            App.showToast("Error de conexión", true);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Iniciar Túnel';
            }
            this.loadNgrokStatus();
        }
    },

    async stopNgrok() {
        try {
            const res = await fetch(this.apiBase, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'stop_ngrok' })
            });
            const data = await res.json();
            if (data.success) {
                const urlInput = document.getElementById('ngrok-url');
                if (urlInput) {
                    urlInput.value = '';
                    urlInput.placeholder = 'Túnel detenido';
                }
                App.showToast("Túnel detenido", false);
            }
        } catch (e) {
            App.showToast("Error al detener", true);
        } finally {
            this.loadNgrokStatus();
        }
    },

    async loadNgrokStatus() {
        try {
            const res = await fetch(`${this.apiBase}?action=get_ngrok_status`);
            const data = await res.json();
            const urlInput = document.getElementById('ngrok-url');
            const btnStart = document.getElementById('btn-start-ngrok');
            const btnStop = document.getElementById('btn-stop-ngrok');

            if (data.success && data.url) {
                if (urlInput) urlInput.value = data.url;
                if (btnStart) btnStart.style.display = 'none';
                if (btnStop) btnStop.style.display = 'block';
            } else {
                if (urlInput) {
                    urlInput.value = '';
                    urlInput.placeholder = 'No hay túnel activo';
                }
                if (btnStart) btnStart.style.display = 'block';
                if (btnStop) btnStop.style.display = 'none';
            }
        } catch (e) {}
    },

    copyNgrok() {
        const urlInput = document.getElementById('ngrok-url');
        if (urlInput && urlInput.value) {
            urlInput.select();
            document.execCommand('copy');
            App.showToast("Enlace copiado al portapapeles", false);
        } else {
            App.showToast("No hay enlace para copiar", true);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => Admin.init());
