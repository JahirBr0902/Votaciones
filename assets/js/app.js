const App = {
    selectedWitmacId: null,
    selectedRyPId: null,
    apiBase: 'app/api/api.php',
    timerInterval: null,
    statusInterval: null,
    votingActive: false,
    winnerModeActive: false,
    votedCompanies: [],
    myVotes: [], // Para guardar localmente por quién voté

    init() {
        // Cargar votos guardados del almacenamiento local
        const saved = localStorage.getItem('witmac_votos_2026');
        if (saved) this.myVotes = JSON.parse(saved);

        window.addEventListener('hashchange', () => this.route());
        this.route();
        
        if (this.statusInterval) clearInterval(this.statusInterval);
        this.statusInterval = setInterval(() => this.checkSystemStatus(), 30000);
    },

    async checkSystemStatus() {
        if (window.location.hash !== '' && window.location.hash !== '#vote') return;
        try {
            const res = await fetch(`${this.apiBase}?action=get_voting_status`);
            const data = await res.json();
            if (this.votingActive && !data.active) this.route(); 
            const resWinner = await fetch(`${this.apiBase}?action=get_show_winner`);
            const dataWinner = await resWinner.json();
            if (!this.winnerModeActive && dataWinner.show_winner) this.route();
        } catch (e) {}
    },

    async route() {
        const hash = window.location.hash || '#vote';
        const main = document.getElementById('main-content');
        if (hash === '#vote') {
            await this.loadView('app/views/vote.html', () => this.initVoteView());
        } else if (hash === '#results') {
            await this.loadView('app/views/results.html', () => this.initResultsView());
        } else {
            if (main) main.innerHTML = '<h1>404 - Not Found</h1>';
        }
    },

    async loadView(viewPath, callback) {
        const main = document.getElementById('main-content');
        if (!main) return; 
        try {
            const res = await fetch(viewPath);
            if (!res.ok) throw new Error('Error');
            const html = await res.text();
            main.innerHTML = html;
            if (callback) callback();
        } catch (e) {
            main.innerHTML = `<div class="loading">Error al cargar la vista</div>`;
        }
    },

    async initVoteView() {
        this.selectedWitmacId = null;
        this.selectedRyPId = null;
        this.initTimer();

        const container = document.getElementById('employees-container');
        try {
            const resStatus = await fetch(`${this.apiBase}?action=get_voting_status`);
            const dataStatus = await resStatus.json();
            this.votingActive = dataStatus.active;
            this.updateHeaderStatus(dataStatus.active);

            const resWinner = await fetch(`${this.apiBase}?action=get_show_winner`);
            const dataWinner = await resWinner.json();
            this.winnerModeActive = dataWinner.show_winner;

            if (dataWinner.success && dataWinner.show_winner) {
                this.renderWinnerMode();
                return; 
            }

            const res = await fetch(`${this.apiBase}?action=get_employees`);
            const data = await res.json();
            if (data.success) {
                this.votedCompanies = data.voted_companies || [];
                this.renderEmployees(data.employees);
            }
        } catch (e) {
            if(container) container.innerHTML = '<div class="loading">Error de conexión.</div>';
        }

        const btnVote = document.getElementById('btn-vote');
        if (btnVote) {
            btnVote.disabled = true;
            const newBtn = btnVote.cloneNode(true);
            btnVote.parentNode.replaceChild(newBtn, btnVote);
            newBtn.addEventListener('click', () => this.submitVotes());
        }
    },

    updateHeaderStatus(active) {
        const headerStatus = document.querySelector('.header-meta strong');
        const headerText = document.querySelector('.header-meta')?.childNodes[2];
        if (headerStatus) {
            headerStatus.textContent = active ? 'ACTIVO' : 'CERRADO';
            headerStatus.style.color = active ? 'var(--company-blue)' : 'var(--muted)';
            if(headerText) headerText.textContent = active ? ' Elección en curso' : ' Votaciones finalizadas';
        }
    },

    renderEmployees(list) {
        const container = document.getElementById('employees-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="privacy-notice" style="margin-bottom: 2.5rem; justify-content: center; background: var(--accent-pale); color: var(--accent); border: 1px solid var(--accent);">
                <span>✦ Selecciona <strong>un candidato de cada empresa</strong></span>
            </div>
            <div id="companies-wrapper"></div>
        `;

        const wrapper = document.getElementById('companies-wrapper');
        const groups = {
            'Witmac': list.filter(e => e.company === 'Witmac'),
            'RyP': list.filter(e => e.company === 'RyP')
        };

        const companyNames = { 'Witmac': 'Witmac', 'RyP': 'Recargalos y Pagalos' };
        const companyEntries = Object.entries(groups).sort(() => Math.random() - 0.5);

        companyEntries.forEach(([companyKey, employees]) => {
            if (employees.length === 0) return;

            const section = document.createElement('div');
            const isVoted = this.votedCompanies.includes(companyKey);
            section.className = `company-section ${(!this.votingActive || isVoted) ? 'company-voted' : ''}`;
            section.id = `section-${companyKey}`;
            
            section.innerHTML = `
                <div style="text-align: center; margin: 3rem 0 2rem;">
                    <h3 style="font-family: 'Bebas Neue', sans-serif; font-size: 2.5rem; border-bottom: 4px solid var(--accent); display: inline-block; padding: 0 2rem;">
                        ${companyNames[companyKey]}
                    </h3>
                </div>
                <div class="employees-grid"></div>
            `;
            wrapper.appendChild(section);

            const grid = section.querySelector('.employees-grid');
            employees.forEach((emp, i) => {
                const card = document.createElement('div');
                // Si este es el ID por el que votamos antes, marcarlo
                const isMyVote = this.myVotes.includes(emp.id);
                card.className = `employee-card ${isMyVote ? 'selected' : ''}`;
                card.dataset.id = emp.id;
                card.dataset.company = companyKey;
                
                const avatarHtml = emp.image_path 
                    ? `<div class="avatar-img" style="background-image: url('${emp.image_path}')"></div>`
                    : `<div class="avatar">${emp.avatar}</div>`;

                card.innerHTML = `
                    <span class="card-number">${companyKey === 'RyP' ? 'RP' : 'W'}${i+1}</span>
                    ${avatarHtml}
                    <div class="employee-name">${emp.name}</div>
                    <div class="employee-dept">${emp.department}</div>
                    <div class="check-mark">✓</div>
                    ${isMyVote ? '<div style="position:absolute; top:0; right:0; background:var(--company-blue); color:white; font-size:0.5rem; padding:0.2rem 0.5rem; font-weight:bold; letter-spacing:0.05em;">TU VOTO</div>' : ''}
                `;
                
                if (this.votingActive && !isVoted) {
                    card.addEventListener('click', () => this.handleSelection(emp.id, companyKey));
                }
                grid.appendChild(card);
            });
        });
    },

    handleSelection(id, company) {
        const isWitmac = (company === 'Witmac');
        const currentId = isWitmac ? this.selectedWitmacId : this.selectedRyPId;
        const section = document.getElementById(`section-${company}`);

        if (!section) return;

        if (currentId === id) {
            if (isWitmac) this.selectedWitmacId = null; else this.selectedRyPId = null;
            section.classList.remove('company-voted');
            document.querySelector(`.employee-card[data-id="${id}"]`).classList.remove('selected');
        } else {
            document.querySelectorAll(`.employee-card[data-company="${company}"]`).forEach(c => c.classList.remove('selected'));
            if (isWitmac) this.selectedWitmacId = id; else this.selectedRyPId = id;
            document.querySelector(`.employee-card[data-id="${id}"]`).classList.add('selected');
            section.classList.add('company-voted');
        }
        this.updatePreview();
    },

    updatePreview() {
        const preview = document.getElementById('selected-preview');
        const btn = document.getElementById('btn-vote');
        if (!preview) return;

        let selected = [];
        if (this.selectedWitmacId) selected.push("Witmac");
        if (this.selectedRyPId) selected.push("RyP");

        preview.innerHTML = selected.length > 0 
            ? `Seleccionados: <strong style="color:var(--company-blue)">${selected.join(' y ')}</strong>`
            : "Selecciona tus candidatos";
        
        if (btn) btn.disabled = (selected.length === 0);
    },

    async submitVotes() {
        const votes = [this.selectedWitmacId, this.selectedRyPId].filter(id => id !== null);
        const result = await Swal.fire({
            title: '¿Confirmar votos?',
            text: `Vas a emitir ${votes.length} voto(s).`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1e3a8a',
            confirmButtonText: 'Sí, votar'
        });

        if (!result.isConfirmed) return;
        const fingerprint = this.getFingerprint();
        
        try {
            const successIds = [];
            const errors = [];
            
            for (const id of votes) {
                const res = await fetch(this.apiBase, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'vote', employee_id: id, fingerprint })
                });
                const data = await res.json();
                if (data.success) {
                    successIds.push(id);
                } else {
                    errors.push(data.message || 'Error desconocido');
                }
            }

            if (successIds.length > 0) {
                // Guardar en local el histórico de votos
                this.myVotes = [...new Set([...this.myVotes, ...successIds])];
                localStorage.setItem('witmac_votos_2026', JSON.stringify(this.myVotes));

                await Swal.fire({ title: '¡Éxito!', text: 'Votos registrados.', icon: 'success', timer: 2000, showConfirmButton: false });
                window.location.hash = '#results';
            } else if (errors.length > 0) {
                // Mostrar el primer error encontrado (usualmente "voto previo detectado")
                await Swal.fire({ 
                    title: 'No se pudo votar', 
                    text: errors[0], 
                    icon: 'warning',
                    confirmButtonColor: '#1e3a8a'
                });
            }
        } catch (e) {
            this.showToast('Error al votar', true);
        }
    },

    getFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const txt = 'Witmac-Security-V3-2026';
        ctx.textBaseline = "top"; ctx.font = "16px 'Arial'";
        ctx.fillText(txt, 2, 2);
        ctx.fillStyle = "rgba(102, 204, 0, 0.5)";
        ctx.fillText(txt, 4, 4);
        return btoa(canvas.toDataURL() + navigator.userAgent + screen.width).slice(-60, -10);
    },

    async initTimer() {
        try {
            const res = await fetch(`${this.apiBase}?action=get_voting_end_time`);
            const data = await res.json();
            if (data.success && data.end_time) {
                const endTime = new Date(data.end_time).getTime();
                const timerEl = document.getElementById('timer-countdown');
                const timerContainer = document.getElementById('voting-timer');
                if (!timerEl) return;
                if (this.timerInterval) clearInterval(this.timerInterval);
                this.timerInterval = setInterval(() => {
                    const now = new Date().getTime();
                    const distance = endTime - now;
                    if (distance < 0) {
                        clearInterval(this.timerInterval);
                        timerEl.textContent = "CERRADO";
                        this.checkSystemStatus();
                        return;
                    }
                    const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                    const s = Math.floor((distance % (1000 * 60)) / 1000);
                    timerEl.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                    if(timerContainer) timerContainer.style.display = 'block';
                }, 1000);
            }
        } catch (e) {}
    },

    async initResultsView() {
        await this.loadResults();
        this.initTimer();
        const btnRefresh = document.getElementById('btn-refresh');
        if(btnRefresh) {
            const newBtn = btnRefresh.cloneNode(true);
            btnRefresh.parentNode.replaceChild(newBtn, btnRefresh);
            newBtn.addEventListener('click', () => this.loadResults());
        }
    },

    async loadResults() {
        try {
            const res = await fetch(`${this.apiBase}?action=get_results`);
            const data = await res.json();
            if (data.success) this.renderResults(data.results, data.total);
        } catch (e) {}
    },

    renderResults(results, total) {
        const container = document.getElementById('results-container');
        if (!container) return;
        const statsBar = document.getElementById('stats-bar');
        if (statsBar) statsBar.style.display = 'flex';
        if (document.getElementById('total-votes')) document.getElementById('total-votes').textContent = total;
        if (document.getElementById('candidates-count')) document.getElementById('candidates-count').textContent = results.length;
        if (document.getElementById('leader-pct')) document.getElementById('leader-pct').textContent = (results[0]?.percentage ?? 0) + '%';

        const list = document.createElement('div');
        list.className = 'results-list';
        let lastComp = "";
        results.forEach((r) => {
            if (r.company !== lastComp) {
                const sep = document.createElement('div');
                sep.className = "privacy-notice";
                sep.style = "background: var(--ink); color: white; margin-top: 2rem; border:none;";
                sep.textContent = `RESULTADOS: ${r.company === 'RyP' ? 'Recargalos y Pagalos' : r.company}`;
                list.appendChild(sep);
                lastComp = r.company;
            }
            
            const isMyVote = this.myVotes.includes(r.id);
            const row = document.createElement('div');
            row.className = `result-row animate-in rank-${r.rank} ${isMyVote ? 'my-voted-row' : ''}`;
            row.innerHTML = `
                <div class="progress-bg" style="background:${this.getBarColor(r.rank)}"></div>
                <div class="rank-badge">${r.rank === 1 ? '★' : r.rank}</div>
                <div class="candidate-info">
                    <div class="candidate-alias">
                        ${r.name || r.alias} ${r.rank === 1 ? '✦' : ''}
                        ${isMyVote ? '<span style="background:var(--company-blue); color:white; font-size:0.5rem; padding:0.1rem 0.4rem; margin-left:0.5rem; font-weight:bold;">TU ELECCIÓN</span>' : ''}
                    </div>
                    <div class="candidate-dept">${r.department}</div>
                </div>
                <div class="vote-display">
                    <div class="percentage" id="pct-${r.id}">0%</div>
                    <div class="vote-count">${r.votes} votos</div>
                </div>
            `;
            list.appendChild(row);
        });
        container.innerHTML = '';
        container.appendChild(list);
        list.querySelectorAll('.result-row').forEach((row, i) => {
            setTimeout(() => {
                const prog = row.querySelector('.progress-bg');
                if (prog) prog.style.width = results[i].percentage + '%';
                this.animateCount(`pct-${results[i].id}`, results[i].percentage, '%', 1200);
            }, i * 100);
        });
        this.renderChart(results);
    },

    async renderWinnerMode() {
        const container = document.getElementById('main-content');
        if (!container) return;
        try {
            const res = await fetch(`${this.apiBase}?action=get_results`);
            const data = await res.json();
            if (data.success && data.results.length > 0) {
                const winners = data.results.filter(r => r.rank === 1);
                let html = '';
                winners.forEach(w => {
                    const isMyVote = this.myVotes.includes(w.id);
                    html += `
                        <div class="winner-card" style="margin: 1rem; flex: 1; min-width: 280px; padding: 2rem; border: 2px solid var(--accent); background: white; box-shadow: 15px 15px 0 var(--accent-pale); position:relative;">
                            ${isMyVote ? '<div style="position:absolute; top:1rem; right:1rem; background:var(--company-blue); color:white; font-size:0.6rem; padding:0.3rem 0.6rem; font-weight:bold;">TU VOTO</div>' : ''}
                            <div class="avatar-img" style="width: 150px; height: 180px; border-radius: 10px; margin: 0 auto 1.5rem; background-image: url('${w.image || 'assets/img/empleados/default.jpg'}'); border-color: var(--company-blue); border-width: 6px;"></div>
                            <h3 style="font-family: 'Bebas Neue', sans-serif; font-size: 2.2rem;">${w.name || w.alias}</h3>
                            <p style="text-transform: uppercase; font-size: 0.8rem;">${w.company === 'RyP' ? 'RyP' : w.company} - ${w.department}</p>
                            <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
                                <span style="font-family: 'Bebas Neue', sans-serif; font-size: 1.5rem; color: var(--accent);">${w.votes} VOTOS</span>
                            </div>
                        </div>`;
                });
                container.innerHTML = `
                    <div class="winner-announcement animate-in" style="text-align: center; padding: 2rem; background: var(--card-bg); border: 3px double var(--accent);">
                        <p class="kicker">Elección Finalizada</p>
                        <h2 style="font-family: 'Bebas Neue', sans-serif; font-size: 4rem;">¡Tenemos Ganadores!</h2>
                        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; margin-top: 2rem;">${html}</div>
                        <div style="margin-top: 3rem;"><a href="#results" class="btn-refresh">Ver Tabla de Resultados</a></div>
                    </div>`;
            }
        } catch (e) {}
    },

    renderChart(results) {
        const barsDiv = document.getElementById('chart-bars');
        const section = document.getElementById('chart-section');
        if (!barsDiv || !section) return;
        section.style.display = 'block';
        barsDiv.innerHTML = '';
        const max = Math.max(...results.map(r => r.percentage), 1);
        results.forEach((r, i) => {
            const col = document.createElement('div');
            col.className = 'bar-col';
            col.innerHTML = `<div class="bar-pct" id="bpct-${r.id}">0%</div><div class="bar-fill rank-${(i % 6) + 1}" id="bar-${r.id}" style="height:0px"></div><div class="bar-label" style="font-size:0.5rem">${r.company}: ${r.alias.replace('Candidato ', '')}</div>`;
            barsDiv.appendChild(col);
            setTimeout(() => {
                const bar = document.getElementById(`bar-${r.id}`);
                if (bar) bar.style.height = Math.round((r.percentage / max) * 140) + 'px';
                this.animateCount(`bpct-${r.id}`, r.percentage, '%', 1200);
            }, i * 50 + 400);
        });
    },

    getBarColor(rank) {
        const c = ['#1e3a8a','#2563eb','#0f172a','#334155','#475569','#94a3b8'];
        return c[rank - 1] || c[5];
    },

    animateCount(id, target, suffix, duration) {
        const el = document.getElementById(id);
        if (!el) return;
        const start = performance.now();
        function step(now) {
            const p = Math.min((now - start) / duration, 1);
            el.textContent = ((1 - Math.pow(1 - p, 3)) * target).toFixed(1) + suffix;
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    },

    showToast(msg, isError) {
        Swal.fire({
            toast: true, position: 'top-end', icon: isError ? 'error' : 'success',
            title: msg, showConfirmButton: false, timer: 3000, timerProgressBar: true
        });
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
