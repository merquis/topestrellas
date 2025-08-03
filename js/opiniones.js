import { CONFIG } from '../js/config.js';
import { translations } from '../js/translations.js';

document.addEventListener('DOMContentLoaded', () => {
    const REVIEWS_API_URL = CONFIG.n8nOpinionesUrl;
    const container = document.getElementById('opiniones-container');
    const statsGrid = document.getElementById('stats-grid');
    const ratingFilter = document.getElementById('rating-filter');
    const timeFilterButtons = {
        all: document.getElementById('filter-all'),
        today: document.getElementById('filter-today'),
        yesterday: document.getElementById('filter-yesterday'),
        week: document.getElementById('filter-week'),
        month: document.getElementById('filter-month'),
        '3months': document.getElementById('filter-3months'),
    };
    const counterElement = document.getElementById('opiniones-counter');
    const paginationContainer = document.getElementById('pagination-container');
    const limitFilter = document.getElementById('limit-filter');

    let currentPage = 1;
    let limit = 100;
    let totalOpiniones = 0;

    const ALL_PRIZES = [
        '🍽️ CENA (VALOR 60€)', '💶 30€ DESCUENTO', '🍾 BOTELLA VINO', '🍦 HELADO',
        '🍺 CERVEZA', '🥤 REFRESCO', '🍹 MOJITO', '🥃 CHUPITO'
    ];

    const updateBrowserUrl = () => {
        const params = new URLSearchParams();
        const selectedRating = ratingFilter.value;
        if (selectedRating !== 'all') {
            params.append('rating', selectedRating);
        }

        const activeTimeFilter = document.querySelector('.filters button.active');
        if (activeTimeFilter && activeTimeFilter.id !== 'filter-all') {
            const dateRange = activeTimeFilter.id.replace('filter-', '');
            const dateMap = { 'today': 'today', 'yesterday': 'yesterday', 'week': '7days', 'month': '1month', '3months': '3months' };
            if (dateMap[dateRange]) {
                params.append('date', dateMap[dateRange]);
            }
        }
        
        if (currentPage > 1) {
            params.append('page', currentPage);
        }

        // Añade siempre el límite a la URL para mayor claridad.
        params.append('limit', limit);

        const queryString = params.toString();
        const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
        history.pushState({ path: newUrl }, '', newUrl);
    };

    const buildApiUrl = () => {
        const params = new URLSearchParams();
        const selectedRating = ratingFilter.value;
        if (selectedRating !== 'all') {
            params.append('rating', selectedRating);
        }

        const activeTimeFilter = document.querySelector('.filters button.active');
        if (activeTimeFilter && activeTimeFilter.id !== 'filter-all') {
            const dateRange = activeTimeFilter.id.replace('filter-', '');
            const dateMap = { 'today': 'today', 'yesterday': 'yesterday', 'week': '7days', 'month': '1month', '3months': '3months' };
            if (dateMap[dateRange]) {
                params.append('date', dateMap[dateRange]);
            }
        }
        
        params.append('page', currentPage);
        params.append('limit', limit);
        params.append('t', new Date().getTime());
        return `${REVIEWS_API_URL}?${params.toString()}`;
    };

    const fetchOpiniones = async () => {
        container.innerHTML = '<div class="loader">Cargando opiniones...</div>';
        statsGrid.innerHTML = '<div class="loader">Calculando estadísticas...</div>';
        paginationContainer.innerHTML = '';
        const url = buildApiUrl();

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error en la petición: ${response.statusText}`);
            
            const responseData = await response.json();
            const data = responseData[0] || {};
            const opiniones = data.opiniones || [];
            totalOpiniones = data.total || 0;
            
            renderOpiniones(opiniones);
            renderStats(opiniones);
            renderPagination();

        } catch (error) {
            container.innerHTML = `<div class="message">Error al cargar las opiniones: ${error.message}</div>`;
            statsGrid.innerHTML = `<div class="message">No se pudieron calcular las estadísticas.</div>`;
            counterElement.textContent = '';
        }
    };

    const renderOpiniones = (opiniones) => {
        const start = (currentPage - 1) * limit + 1;
        const end = start + opiniones.length - 1;
        counterElement.textContent = `Mostrando ${start}-${end} de ${totalOpiniones} opiniones.`;

        if (totalOpiniones === 0) {
            container.innerHTML = '<div class="message">No se encontraron opiniones con los filtros seleccionados.</div>';
            counterElement.textContent = 'No hay opiniones para mostrar.';
        } else {
            container.innerHTML = opiniones.map(createOpinionHTML).join('');
        }
    };
    
    const renderPagination = () => {
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(totalOpiniones / limit);

        if (totalPages <= 1) return;

        const createButton = (text, page, isDisabled = false, isActive = false) => {
            const button = document.createElement('button');
            button.innerHTML = text;
            button.disabled = isDisabled;
            if (isActive) button.classList.add('active');
            button.addEventListener('click', () => {
                currentPage = page;
                fetchOpiniones();
                updateBrowserUrl();
            });
            return button;
        };

        paginationContainer.appendChild(createButton('Anterior', currentPage - 1, currentPage === 1));

        for (let i = 1; i <= totalPages; i++) {
            paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
        }

        paginationContainer.appendChild(createButton('Siguiente', currentPage + 1, currentPage === totalPages));
    };

    const getPrizeIndex = (prizeName, lang) => {
        if (!prizeName) return -1;

        // Priorizar el prizeIndex si ya viene en los datos (para nuevas opiniones)
        if (typeof prizeName === 'number') {
            return prizeName;
        }

        const langCode = lang && translations[lang] ? lang : 'es';
        const prizeList = translations[langCode]?.prizes;

        if (prizeList) {
            const index = prizeList.indexOf(prizeName);
            if (index !== -1) return index;
        }

        // Fallback: si no se encuentra en el idioma especificado, buscar en todos
        for (const key in translations) {
            const list = translations[key].prizes;
            if (list) {
                const index = list.indexOf(prizeName);
                if (index !== -1) return index;
            }
        }

        return -1; // No se encontró en ningún idioma
    };

    const renderStats = (opiniones) => {
        const totalPrizesContainer = document.getElementById('total-prizes-container');
        if (totalOpiniones === 0) {
            statsGrid.innerHTML = '<div class="message">No hay datos para mostrar estadísticas.</div>';
            totalPrizesContainer.innerHTML = '';
            return;
        }

        const prizeCounts = new Array(ALL_PRIZES.length).fill(0);
        let totalPrizesAwarded = 0;

        opiniones.forEach(opinion => {
            const index = getPrizeIndex(opinion.premio, opinion.lang);
            if (index !== -1) {
                prizeCounts[index]++;
                totalPrizesAwarded++;
            }
        });

        totalPrizesContainer.innerHTML = `<strong>Total de Premios Entregados:</strong> ${totalPrizesAwarded}`;

        statsGrid.innerHTML = ALL_PRIZES.map((prize, index) => {
            const count = prizeCounts[index];
            const percentage = totalOpiniones > 0 ? ((count / totalOpiniones) * 100).toFixed(1) : 0;
            const [emoji, ...nameParts] = prize.split(' ');
            const name = nameParts.join(' ');
            return `<div class="stats-item"><div>${emoji} ${name}</div><strong>${percentage}%</strong><div>(${count})</div></div>`;
        }).join('');
    };

    const createOpinionHTML = (opinion) => {
        const stars = '★'.repeat(opinion.rating || 0) + '☆'.repeat(5 - (opinion.rating || 0));
        const reviewText = opinion.review || 'Comentario no proporcionado';
        // DEBUG: Mostrar en consola el valor original y cómo lo interpreta JS
        if (opinion.date_real) {
          console.log('DEBUG date_real original:', opinion.date_real);
          console.log('DEBUG interpretado JS (UTC):', new Date(opinion.date_real).toISOString());
        }
        // Mostrar la fecha y hora tal cual vienen en el string ISO, sin conversión de zona horaria
        let date = 'N/A', time = 'N/A';
        if (opinion.date_real) {
          const [fecha, hora] = opinion.date_real.split('T');
          date = fecha.split('-').reverse().join('/'); // Formato DD/MM/YYYY
          time = hora ? hora.substring(0, 8) : '';
        }
        return `
            <div class="opinion-card">
                <div class="opinion-card-header">
                    <span class="name">${opinion.name || 'Anónimo'}</span>
                    <span class="rating">${stars}</span>
                </div>
                <div class="review"><blockquote>${reviewText}</blockquote></div>
                <div class="opinion-card-footer">
                    <span><strong>Fecha:</strong> ${date}, ${time}</span>
                    <span><strong>Premio:</strong> ${opinion.premio || 'N/A'} (${opinion.codigoPremio || 'N/A'})</span>
                    <span><strong>Idioma:</strong> ${(opinion.lang || 'N/A').toUpperCase()}</span>
                </div>
            </div>`;
    };

    const handleFilterChange = () => {
        currentPage = 1;
        limit = parseInt(limitFilter.value, 10) || 100;
        updateBrowserUrl();
        fetchOpiniones();
    };

    const applyFiltersFromUrl = () => {
        const params = new URLSearchParams(window.location.search);
        let changed = false;

        // Si falta 'date', ponerlo a 'today'
        if (!params.has('date')) {
            params.set('date', 'today');
            changed = true;
        }
        // Si falta 'limit', ponerlo al valor por defecto (100)
        if (!params.has('limit')) {
            params.set('limit', '100');
            changed = true;
        }
        // Si hemos cambiado algo, actualizar la URL sin recargar
        if (changed) {
            history.replaceState(null, '', `?${params.toString()}`);
        }
        
        const rating = params.get('rating');
        if (rating && ratingFilter.querySelector(`option[value="${rating}"]`)) {
            ratingFilter.value = rating;
        }

        const urlLimit = parseInt(params.get('limit'), 10);
        // Comprueba si el valor de la URL es un número y si existe como opción en el select.
        if (!isNaN(urlLimit) && limitFilter.querySelector(`option[value="${urlLimit}"]`)) {
            limit = urlLimit;
            limitFilter.value = urlLimit;
        }

        const date = params.get('date');
        const dateMap = { 'today': 'today', 'yesterday': 'yesterday', 'week': '7days', 'month': '1month', '3months': '3months' };
        Object.values(timeFilterButtons).forEach(btn => btn.classList.remove('active'));
        
        let activeDateButton;
        if (date && dateMap[date]) {
            const buttonId = `filter-${dateMap[date]}`;
            activeDateButton = document.getElementById(buttonId);
        } else {
            activeDateButton = timeFilterButtons.all;
        }
        activeDateButton.classList.add('active');
        
        const page = parseInt(params.get('page'), 10);
        if (page > 1) {
            currentPage = page;
        }
    };

    ratingFilter.addEventListener('change', handleFilterChange);
    limitFilter.addEventListener('change', handleFilterChange);
    Object.values(timeFilterButtons).forEach(button => {
        button.addEventListener('click', (e) => {
            Object.values(timeFilterButtons).forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            handleFilterChange();
        });
    });

    applyFiltersFromUrl();
    fetchOpiniones();
});
