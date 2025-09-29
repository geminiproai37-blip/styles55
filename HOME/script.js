document.addEventListener('DOMContentLoaded', () => {
    // --- Check for config variables ---
    if (typeof TMDB_API_KEY === 'undefined' || typeof DEFAULT_HTML_URL === 'undefined') {
        document.body.innerHTML = '<div style="color: red; font-size: 20px; text-align: center; padding: 50px;">Error: El archivo de configuración (config.js) no se cargó correctamente o faltan variables.</div>';
        return;
    }

    let PREDEFINED_CATEGORIES = [];
    let ALL_GENRES = {
        tmdb: [],
        mal: []
    };

    // --- Responsive Elements ---
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const headerTitle = document.getElementById('headerTitle');
    const globalSearchContainer = document.getElementById('globalSearchContainer');
    const globalSearchInput = document.getElementById('globalSearchInput');
    const logoSuffix = document.getElementById('logo-suffix');
    const modeNormalBtn = document.getElementById('modeNormalBtn');
    const modeAdultBtn = document.getElementById('modeAdultBtn');
    
    // Elementos del DOM
    const openLoadModalBtn = document.getElementById('openLoadModalBtn');
    const loadHtmlModal = document.getElementById('loadHtmlModal');
    const cancelLoadBtn = document.getElementById('cancelLoadBtn');
    const processHtmlBtn = document.getElementById('processHtmlBtn');
    const htmlInput = document.getElementById('htmlInput');
    const generateHtmlBtn = document.getElementById('generateHtmlBtn');
    const adminPanel = document.getElementById('adminPanel');
    const adminPanelPlaceholder = document.getElementById('adminPanelPlaceholder');
    const sidebarNav = document.getElementById('sidebar-nav');
    
    const modal = document.getElementById('editModal');
    const modalBackBtn = document.querySelector('#editModal .modal-back-btn');
    const editForm = document.getElementById('editForm');
    const cancelBtn = document.getElementById('cancelBtn');
    
    const tabCode = document.getElementById('tab-code');
    const contentCode = document.getElementById('content-code');

    const generateHtmlModal = document.getElementById('generateHtmlModal');
    const closeGeneratedHtmlBtn = document.getElementById('closeGeneratedHtmlBtn');
    const copyGeneratedHtmlBtn = document.getElementById('copyGeneratedHtmlBtn');

    const confirmationModal = document.getElementById('confirmationModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    let dataStore = {};
    let augmentedDataStore = {};
    let paginationState = {};
    const ITEMS_PER_PAGE = 12;
    let htmlTemplateBase = ''; // Stores the HTML content without the data declarations
    let loaderTemplate = ''; // Stores the loader HTML if present

    const sectionTemplates = {
        configuracion: { title: 'Configuración Global', icon: 'fa-cog', isSingle: true, isConfig: true },
        explosivoContent: { title: 'Contenido Destacado', icon: 'fa-star', isSingle: true, isFeaturedCard: true, source: 'explosivoContent' },
        secicondEdestacadoContent: { title: 'Contenido Destacado +18', icon: 'fa-fire', isSingle: true, isFeaturedCard: true, isAdultSection: true, source: 'secicondEdestacadoContent' },
        latestEpisodes: { title: 'Últimos Capítulos', icon: 'fa-clapperboard', isSingle: false, isEpisodeCard: true, source: 'latestEpisodes', filter: item => !item.isAdult },
        latestEpisodes18: { title: 'Últimos Capítulos +18', icon: 'fa-clapperboard', isSingle: false, isEpisodeCard: true, isAdultSection: true, source: 'latestEpisodes', filter: item => item.isAdult },
        peliculas: { title: 'Películas', icon: 'fa-film', isSingle: false, source: 'contentDefinitionsFromDb', filter: item => item.tipo === 'movie' && !item.isAdult },
        series: { title: 'Series', icon: 'fa-tv', isSingle: false, source: 'contentDefinitionsFromDb', filter: item => item.tipo === 'tv' && !item.isAdult },
        peliculas18: { title: 'Películas +18', icon: 'fa-film', isSingle: false, isAdultSection: true, source: 'contentDefinitionsFromDb', filter: item => item.tipo === 'movie' && item.isAdult },
        series18: { title: 'Series +18', icon: 'fa-tv', isSingle: false, isAdultSection: true, source: 'contentDefinitionsFromDb', filter: item => item.tipo === 'tv' && item.isAdult }
    };

    // --- Setup Inicial ---
    const initializeCategoryCheckboxes = (selectedCategories = []) => {
        const container = document.getElementById('predefined-categories-list');
        if (!container) {
            console.error('Error: El contenedor de categorías "predefined-categories-list" no se encontró en el DOM.');
            return;
        }
        container.innerHTML = PREDEFINED_CATEGORIES.map(cat => `
            <label class="flex items-center space-x-2 text-sm cursor-pointer">
                <input type="checkbox" name="predefined_category" value="${cat}" class="h-4 w-4 text-primary bg-dark-border border-dark-border rounded focus:ring-primary" ${selectedCategories.includes(cat) ? 'checked' : ''}>
                <span class="capitalize">${cat}</span>
            </label>
        `).join('');
    };
    
    const initializeApp = async () => {
        await fetchAllGenres();
        
        initializeCategoryCheckboxes();
        setupEventListeners();
        setMode(false); // Start in normal mode
    };

    // --- Lógica de Menú Móvil y Cambio de Modo ---
    const setMode = (isAdultMode) => {
        document.body.classList.toggle('theme-adult', isAdultMode);
        document.body.classList.toggle('mode-adult', isAdultMode);
        document.body.classList.toggle('mode-normal', !isAdultMode);
        
        logoSuffix.textContent = isAdultMode ? 'H' : 'Lat';

        // Update button styles
        modeNormalBtn.classList.toggle('bg-primary', !isAdultMode);
        modeNormalBtn.classList.toggle('bg-dark-border', isAdultMode);
        modeNormalBtn.classList.toggle('hover:bg-slate-600', isAdultMode);

        modeAdultBtn.classList.toggle('bg-primary', isAdultMode);
        modeAdultBtn.classList.toggle('bg-dark-border', !isAdultMode);
        modeAdultBtn.classList.toggle('hover:bg-slate-600', !isAdultMode);

        // If the currently selected sidebar link is now hidden, switch to dashboard
        const activeLink = sidebarNav.querySelector('.sidebar-link.active');
        if (activeLink && activeLink.dataset.key !== 'all' && activeLink.dataset.key !== 'configuracion') {
            const isLinkAdult = activeLink.classList.contains('adult-content-section');
            if (isAdultMode ? !isLinkAdult : isLinkAdult) {
                sidebarNav.querySelector('.sidebar-link[data-key="all"]')?.click();
            }
        }
    };

    const toggleSidebar = () => {
        sidebar.classList.toggle('-translate-x-full');
        sidebarOverlay.classList.toggle('hidden');
    };

    // --- Lógica de Modales y Pestañas ---
    const openModal = (modalElement) => {
        modalElement.classList.remove('hidden');
        // Force reflow to ensure transition applies
        void modalElement.offsetWidth;
        modalElement.classList.add('opacity-100', 'scale-100');
    };
    const closeModal = (modalElement) => {
        modalElement.classList.remove('opacity-100', 'scale-100');
        modalElement.classList.add('hidden');
    };

    // --- Lógica Principal de Carga y Procesamiento ---
    const processHtml = async () => {
        if (!getApiKey()) return;

        let htmlContent = htmlInput.value;
        if (!htmlContent.trim()) return showToast('El campo de HTML está vacío.', true);

        try {
            const loaderRegex = /const indexHtmlContent = `([\s\S]*)`;/;
            const loaderMatch = htmlContent.match(loaderRegex);

            if (loaderMatch && loaderMatch[1]) {
                loaderTemplate = htmlContent;
                htmlContent = loaderMatch[1];
            } else {
                loaderTemplate = ''; // Reset if not a loader
            }

            const regexMap = {
                title: /<title>([\s\S]*?)<\/title>/,
                globalBannerUrl: /window\.globalBannerUrl\s*=\s*(".*?");/,
                globalProfileGifUrl: /window\.globalProfileGifUrl\s*=\s*(".*?");/,
                globalDeveloperName: /window\.globalDeveloperName\s*=\s*(".*?");/,
                globalAppVersion: /window\.globalAppVersion\s*=\s*(".*?");/,
                explosivoContent: /window\.explosivoContent\s*=\s*({[\s\S]*?});/,
                secicondEdestacadoContent: /window\.secicondEdestacadoContent\s*=\s*({[\s\S]*?});/,
                contentDefinitionsFromDb: /window\.contentDefinitionsFromDb\s*=\s*(\[[\s\S]*?\]);/,
                latestEpisodes: /window\.latestEpisodes\s*=\s*(\[[\s\S]*?\]);/
            };
            
            const idScriptRegex = /<script id="yami-lat-data">([\s\S]*?)<\/script>/;
            const idMatch = htmlContent.match(idScriptRegex);
            let contentToParse;

            if (idMatch && idMatch[1]) {
                contentToParse = idMatch[1];
                htmlTemplateBase = htmlContent.replace(idScriptRegex, '<!-- YamiLat Data Placeholder -->');
            } else {
                contentToParse = htmlContent;
                const dataDeclarationRegex = /window\.(explosivoContent|secicondEdestacadoContent|contentDefinitionsFromDb|latestEpisodes|globalBannerUrl|globalProfileGifUrl|globalDeveloperName|globalAppVersion)\s*=\s*(?:{[\s\S]*?}|[\[\s\S]*?\]|".*?");/g;
                htmlTemplateBase = htmlContent.replace(dataDeclarationRegex, '');
            }

            dataStore = {};
            Object.keys(regexMap).forEach(key => {
                const searchTarget = key === 'title' ? htmlContent : contentToParse;
                const match = searchTarget.match(regexMap[key]);
                if (match && match[1]) {
                    if (key === 'title') {
                        dataStore[key] = match[1];
                    } else {
                        try {
                           dataStore[key] = new Function(`return ${match[1]}`)();
                        } catch(e) {
                           console.error(`Error parsing data for key: ${key}`, e);
                        }
                    }
                }
            });

            // Asegurarse de que las claves de configuración esenciales existan para activar el panel de configuración
            if (dataStore.title === undefined) dataStore.title = 'Título de la Página';
            if (dataStore.globalBannerUrl === undefined) dataStore.globalBannerUrl = '';
            if (dataStore.globalProfileGifUrl === undefined) dataStore.globalProfileGifUrl = '';
            if (dataStore.globalDeveloperName === undefined) dataStore.globalDeveloperName = 'Desarrollador';
            if (dataStore.globalAppVersion === undefined) dataStore.globalAppVersion = '1.0.0';


            if (Object.keys(dataStore).length === 1 && dataStore.title) {
                // If only default title, not valid real data
            } else if (Object.keys(dataStore).length === 0) {
                showToast('No se encontraron datos válidos en el HTML.', true);
                htmlTemplateBase = htmlContent;
                return;
            }

            // Clean the title from the template base, as it's handled separately.
            htmlTemplateBase = htmlTemplateBase.replace(/<title>[\s\S]*?<\/title>/, '<title></title>');

            renderAdminPanel();
            renderSidebarNav();
            showToast('Panel cargado con éxito.');
            closeModal(loadHtmlModal);
        } catch (error) {
            console.error('Error al parsear el HTML:', error);
            showToast('Error al parsear el HTML.', true);
        }
    };

    // --- Funciones de Utilidad ---
    const showToast = (message, isError = false) => {
        const toast = document.getElementById('toast');
        toast.firstElementChild.textContent = message;
        toast.className = `fixed bottom-5 right-5 text-white py-2 px-4 rounded-lg shadow-lg text-sm z-50 ${isError ? 'bg-red-600' : 'bg-green-600'}`;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    };

    const getApiKey = () => {
        if (!TMDB_API_KEY || TMDB_API_KEY === 'REEMPLAZA_CON_TU_API_KEY') {
            showToast('Añade tu API Key en la variable TMDB_API_KEY del archivo config.js.', true);
            return null;
        }
        return TMDB_API_KEY;
    };

    const fetchTMDBData = async (id, type) => {
        const apiKey = getApiKey();
        if (!apiKey) return null;
        try {
            const response = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=es-ES`);
            if (!response.ok) throw new Error('Contenido no encontrado en TMDB.');
            return await response.json();
        } catch (error) {
            console.error('Error fetching TMDB data:', error);
            showToast(error.message, true);
            return null;
        }
    };

    const fetchTMDBEpisodeData = async (tvId, season, episode) => {
        const apiKey = getApiKey();
        if (!apiKey) return null;
        try {
            const response = await fetch(`https://api.themoviedb.org/3/tv/${tvId}/season/${season}/episode/${episode}?api_key=${apiKey}&language=es-ES`);
             if (!response.ok) throw new Error('Episodio no encontrado en TMDB.');
            return await response.json();
        } catch (error) {
            console.error('Error fetching episode data:', error);
            showToast(error.message, true);
            return null;
        }
    };

    const fetchMyAnimeListGenresById = async (mal_id) => {
        if (!mal_id) return { genres: [] };
        try {
            const response = await fetch(`https://api.jikan.moe/v4/anime/${mal_id}`);
            if (!response.ok) throw new Error('Error fetching anime genres from MyAnimeList.');
            const data = await response.json();
            const genres = data.data.genres.map(g => g.name.toLowerCase());
            return { genres };
        } catch (error) {
            console.error('Error fetching MyAnimeList genres by ID:', error);
            return { genres: [] };
        }
    };

    // --- Lógica de Renderizado ---
    const renderConfigSection = () => {
        const configSection = document.createElement('section');
        configSection.id = 'section-configuracion';
        configSection.className = 'p-4 sm:p-6 lg:p-8 normal-content-section';
        configSection.style.display = 'none'; // Initially hidden

        const configItems = [
            { id: 'title', label: 'Título de la Página', type: 'text' },
            { id: 'globalDeveloperName', label: 'Nombre del Desarrollador', type: 'text' },
            { id: 'globalProfileGifUrl', label: 'URL GIF de Fondo/Perfil', type: 'url', isImage: true, isCircular: true },
            { id: 'globalBannerUrl', label: 'URL Banner Global', type: 'url', isImage: true },
            { id: 'globalAppVersion', label: 'Versión de la App', type: 'text' }
        ];

        const itemsHtml = configItems.map(item => {
            if (item.isImage) {
                const imageUrl = dataStore[item.id] || 'https://placehold.co/600x400/0f172a/334155?text=No+Imagen';
                if (item.isCircular) {
                    return `
                        <div class="bg-dark-card p-4 rounded-lg">
                            <p class="text-sm text-gray-400 mb-2">${item.label}</p>
                            <div class="flex justify-between items-center">
                                <div class="relative vip-frame-container">
                                    <img src="${imageUrl}" class="rounded-full h-40 w-40 object-cover" id="config-display-${item.id}">
                                    <div class="vip-insignia"><i class="fas fa-star"></i></div>
                                </div>
                                <button class="edit-config-btn bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg" data-config-id="${item.id}" data-config-label="${item.label}" data-config-type="${item.type}">
                                    <i class="fas fa-pencil-alt"></i>
                                </button>
                            </div>
                        </div>
                    `;
                } else { // Banner
                    return `
                        <div class="bg-dark-card p-4 rounded-lg">
                            <p class="text-sm text-gray-400 mb-2">${item.label}</p>
                            <img src="${imageUrl}" class="w-full h-auto rounded-lg mb-4" id="config-display-${item.id}">
                            <button class="edit-config-btn bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg w-full" data-config-id="${item.id}" data-config-label="${item.label}" data-config-type="${item.type}">
                                <i class="fas fa-pencil-alt mr-2"></i> Editar Banner
                            </button>
                        </div>
                    `;
                }
            } else {
                return `
                    <div class="bg-dark-card p-4 rounded-lg flex justify-between items-center">
                        <div>
                            <p class="text-sm text-gray-400">${item.label}</p>
                            <p class="text-white font-semibold" id="config-display-${item.id}">${dataStore[item.id] || 'No establecido'}</p>
                        </div>
                        <button class="edit-config-btn bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg" data-config-id="${item.id}" data-config-label="${item.label}" data-config-type="${item.type}">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                    </div>
                `;
            }
        }).join('');

        configSection.innerHTML = `
            <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                ${itemsHtml}
            </div>
        `;
        adminPanel.prepend(configSection);

        document.querySelectorAll('.edit-config-btn').forEach(button => {
            button.addEventListener('click', () => {
                const configId = button.dataset.configId;
                const configLabel = button.dataset.configLabel;
                const configType = button.dataset.configType;
                openConfigEditModal(configId, configLabel, configType);
            });
        });
    };

    const openConfigEditModal = (id, label, type) => {
        const modal = document.getElementById('editConfigModal');
        if (!modal) return;

        document.getElementById('editConfigModalTitle').textContent = `Editar ${label}`;
        const input = document.getElementById('editConfigInput');
        input.type = type;
        input.value = dataStore[id] || '';
        input.placeholder = `Introduce el nuevo valor para ${label}`;
        
        document.getElementById('saveConfigEditBtn').dataset.configId = id;

        openModal(modal);
    };

    const saveConfigEdit = () => {
        const modal = document.getElementById('editConfigModal');
        if (!modal) return;

        const id = document.getElementById('saveConfigEditBtn').dataset.configId;
        const input = document.getElementById('editConfigInput');
        const newValue = input.value;

        dataStore[id] = newValue;

        const displayElement = document.getElementById(`config-display-${id}`);
        if (displayElement.tagName === 'IMG') {
            displayElement.src = newValue || 'https://placehold.co/600x400/0f172a/334155?text=No+Imagen';
        } else {
            displayElement.textContent = newValue || 'No establecido';
        }

        updateHtmlOutput();
        showToast('Configuración guardada.');
        closeModal(modal);
    };

    const createFeaturedCardHTML = (item, arrayName, index, tmdbData) => {
        if (!item || !tmdbData) return '';
        const title = item.customTitle || tmdbData.title || tmdbData.name;
        const backdropPath = item.customLogoUrl || (tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}` : 'https://placehold.co/1280x720/0f172a/334155?text=No+Imagen');

        const isAdultFeatured = arrayName === 'secicondEdestacadoContent';

        const cardContent = `
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent rounded-2xl"></div>
            <div class="relative z-10">
                <span class="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full mb-2 inline-block"><i class="fas fa-star mr-1"></i> Estreno Destacado</span>
                <h3 class="text-4xl font-bold text-shadow-lg">${title}</h3>
                <div class="mt-4 flex items-center gap-3">
                     <button class="edit-btn text-sm bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg" data-array-name="${arrayName}" data-index="${index}"><i class="fas fa-pencil-alt mr-2"></i> Editar</button>
                     <a href="${item.customUrl || '#'}" target="_blank" class="text-sm bg-slate-700/80 hover:bg-slate-600/80 text-white font-semibold py-2 px-4 rounded-lg backdrop-blur-sm"><i class="fas fa-info-circle mr-2"></i> Más Información</a>
                </div>
            </div>`;

        if (isAdultFeatured) {
            return `
                <div class="w-full h-80 bg-cover bg-center rounded-2xl shadow-lg relative flex flex-col justify-end p-8 text-white card sensitive-content-container" style="background-image: url('${backdropPath}')">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent rounded-2xl"></div>
                    <div class="relative z-10">
                        <span class="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full mb-2 inline-block"><i class="fas fa-star mr-1"></i> Estreno Destacado</span>
                        <h3 class="text-4xl font-bold text-shadow-lg">${title}</h3>
                        <div class="mt-4 flex items-center gap-3">
                             <button class="edit-btn text-sm bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg" data-array-name="${arrayName}" data-index="${index}"><i class="fas fa-pencil-alt mr-2"></i> Editar</button>
                             <a href="${item.customUrl || '#'}" target="_blank" class="text-sm bg-slate-700/80 hover:bg-slate-600/80 text-white font-semibold py-2 px-4 rounded-lg backdrop-blur-sm"><i class="fas fa-info-circle mr-2"></i> Más Información</a>
                        </div>
                    </div>
                    <div class="absolute inset-0 rounded-2xl featured-blur-overlay"></div>
                    <button class="toggle-visibility-btn"><i class="fas fa-eye"></i></button>
                </div>`;
        } else {
            return `
                <div class="w-full h-80 bg-cover bg-center rounded-2xl shadow-lg relative flex flex-col justify-end p-8 text-white card" style="background-image: url('${backdropPath}')">
                    ${cardContent}
                </div>`;
        }
    };
    
    const createEpisodeCardHTML = (item, arrayName, index, episodeData, seriesData) => {
        if (!item) return '';
        const episodeTitle = episodeData ? `T${item.season}:E${item.episode} - ${episodeData.name}` : `T${item.season}:E${item.episode}`;
        const seriesTitle = seriesData ? seriesData.name : `ID: ${item.id}`;
        const stillPath = episodeData?.still_path ? `https://image.tmdb.org/t/p/w500${episodeData.still_path}` : 'https://placehold.co/1920x1080/1e293b/94a3b8?text=No+Img';
        
        const imageHtml = item.isAdult ? `
            <div class="sensitive-content-container w-full h-full">
                <img src="${stillPath}" alt="${episodeTitle}" class="w-full h-full object-cover blurred" onerror="this.src='https://placehold.co/1920x1080/1e293b/94a3b8?text=Error'">
                <button class="toggle-visibility-btn"><i class="fas fa-eye"></i></button>
            </div>
        ` : `
            <img src="${stillPath}" alt="${episodeTitle}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/1920x1080/1e293b/94a3b8?text=Error'">
        `;

        return `
            <div class="bg-dark-card rounded-lg overflow-hidden shadow-lg relative card episode-card">
                <div class="aspect-video relative">
                     ${imageHtml}
                     <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                     <div class="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center space-y-2 opacity-0 overlay transition-opacity duration-300 p-2">
                        <button class="edit-btn text-xs bg-yellow-500 text-white py-1 px-3 rounded hover:bg-yellow-600" data-array-name="${arrayName}" data-index="${index}"><i class="fas fa-pencil-alt mr-1"></i> Editar</button>
                        <button class="delete-btn text-xs bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700" data-array-name="${arrayName}" data-index="${index}"><i class="fas fa-trash-alt mr-1"></i> Borrar</button>
                    </div>
                </div>
                <div class="p-2.5">
                    <h4 class="text-sm font-semibold truncate text-white" title="${episodeTitle}">${episodeTitle}</h4>
                    <p class="text-xs text-gray-400 truncate" title="${seriesTitle}">${seriesTitle}</p>
                </div>
            </div>`;
    };
    
    const createStandardCardHTML = (item, arrayName, index, tmdbData) => {
        if (!item) return '';
        const isArray = Array.isArray(dataStore[arrayName]);
        const title = item.customTitle || (tmdbData ? (tmdbData.title || tmdbData.name) : `ID: ${item.id}`);
        const posterPath = tmdbData?.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : 'https://placehold.co/500x750/1e293b/94a3b8?text=No+Img';
        
        const imageHtml = item.isAdult ? `
            <div class="sensitive-content-container aspect-[2/3]">
                <img src="${posterPath}" alt="${title}" class="w-full h-full object-cover blurred" onerror="this.src='https://placehold.co/500x750/1e293b/94a3b8?text=Error'">
                <button class="toggle-visibility-btn"><i class="fas fa-eye"></i></button>
            </div>
        ` : `
            <img src="${posterPath}" alt="${title}" class="w-full h-auto object-cover aspect-[2/3]" onerror="this.src='https://placehold.co/500x750/1e293b/94a3b8?text=Error'">
        `;

        return `
            <div class="bg-dark-card rounded-lg overflow-hidden shadow-lg relative card">
                ${imageHtml}
                <div class="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center space-y-2 opacity-0 overlay transition-opacity duration-300">
                    <button class="edit-btn text-xs bg-yellow-500 text-white py-1 px-3 rounded hover:bg-yellow-600" data-array-name="${arrayName}" data-index="${index}"><i class="fas fa-pencil-alt mr-1"></i> Editar</button>
                    ${isArray ? `<button class="delete-btn text-xs bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700" data-array-name="${arrayName}" data-index="${index}"><i class="fas fa-trash-alt mr-1"></i> Borrar</button>` : ''}
                </div>
                <div class="p-2.5">
                    <h4 class="text-sm font-semibold truncate text-white">${title}</h4>
                </div>
            </div>`;
    };

    const rerenderSection = (key) => {
        if (key === 'configuracion') return;
        const sectionInfo = sectionTemplates[key];
        const augmentedData = augmentedDataStore[key];
        if (!augmentedData) return;
        renderSectionContent(key, augmentedData, sectionInfo.source, sectionInfo.isEpisodeCard, sectionInfo.isFeaturedCard);
    };

    const renderPaginationControls = (key, totalItems) => {
        const container = document.getElementById(`pagination-${key}`);
        if (!container) return;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        const currentPage = paginationState[key] || 1;
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = `
            <button class="pagination-btn bg-dark-border hover:bg-slate-600 text-white font-bold py-2 px-3 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed" data-section-key="${key}" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
            <span class="text-white font-semibold">${currentPage} / ${totalPages}</span>
            <button class="pagination-btn bg-dark-border hover:bg-slate-600 text-white font-bold py-2 px-3 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed" data-section-key="${key}" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
    };

    const renderAdminPanel = async () => {
        adminPanel.innerHTML = '';
        adminPanel.appendChild(adminPanelPlaceholder);
        
        if (dataStore.title || dataStore.globalDeveloperName) {
            renderConfigSection();
        }

        const sectionPromises = Object.keys(sectionTemplates).map(async (key) => {
            if (key === 'configuracion') return;
            const sectionInfo = sectionTemplates[key];
            const sourceArrayName = sectionInfo.source;
            if (!dataStore[sourceArrayName]) return;

            let dataForSection;
            if (sectionInfo.isSingle) {
                dataForSection = [{ item: dataStore[sourceArrayName], originalIndex: 0 }];
            } else {
                dataForSection = dataStore[sourceArrayName]
                    .map((item, index) => ({ item, originalIndex: index }))
                    .filter(entry => sectionInfo.filter(entry.item));
            }

            const augmentedData = await Promise.all(dataForSection.map(async (entry) => {
                let tmdbData, episodeData, seriesData;
                if (sectionInfo.isEpisodeCard) {
                    [episodeData, seriesData] = await Promise.all([
                        fetchTMDBEpisodeData(entry.item.id, entry.item.season, entry.item.episode),
                        fetchTMDBData(entry.item.id, entry.item.tipo)
                    ]);
                    const seriesFromDb = dataStore.contentDefinitionsFromDb.find(s => s.id === entry.item.id && s.tipo === entry.item.tipo);
                    if (seriesFromDb && seriesFromDb.customTitle) {
                        if (seriesData) {
                            seriesData.name = seriesFromDb.customTitle;
                        }
                    }
                } else {
                    tmdbData = await fetchTMDBData(entry.item.id, entry.item.tipo);
                }
                const title = tmdbData ? (tmdbData.title || tmdbData.name) : (seriesData ? seriesData.name : '');
                const episodeTitle = episodeData ? `T${entry.item.season}:E${entry.item.episode} - ${episodeData.name}` : '';
                return { ...entry, tmdbData, episodeData, seriesData, title, episodeTitle };
            }));
            augmentedDataStore[key] = augmentedData;

            const section = document.createElement('section');
            section.id = `section-${key}`;
            section.style.display = 'none';
            section.classList.add(sectionInfo.isAdultSection ? 'adult-content-section' : 'normal-content-section');
            section.classList.add('p-4', 'sm:p-6', 'lg:p-8');
            
            const isAddable = !sectionInfo.isSingle;
            section.innerHTML = `
                <div class="section-header">
                    <div class="flex flex-col sm:flex-row justify-end items-center gap-4">
                        ${isAddable ? `<button class="add-btn text-sm bg-primary hover:bg-primary-hover text-white font-semibold py-2 px-4 rounded-lg w-full sm:w-auto flex-shrink-0" data-section-key="${key}"><i class="fas fa-plus mr-2"></i> Añadir</button>` : ''}
                    </div>
                </div>
                <div id="container-${key}" class="card-grid min-h-[300px]"></div>
                <div id="pagination-${key}" class="flex justify-center items-center mt-6 space-x-2"></div>`;
            
            adminPanel.appendChild(section);
            renderSectionContent(key, augmentedData, sourceArrayName, sectionInfo.isEpisodeCard, sectionInfo.isFeaturedCard);
        });

        await Promise.all(sectionPromises);
    };

    const renderSectionContent = (key, data, sourceArrayName, isEpisodeCard = false, isFeaturedCard = false) => {
        const container = document.getElementById(`container-${key}`);
        if (isFeaturedCard) {
            container.classList.remove('card-grid');
            container.classList.add('featured-container');
        } else {
            container.classList.add('card-grid');
            container.classList.remove('featured-container');
        }
        const searchTerm = globalSearchInput.value.toLowerCase();

        const filteredData = searchTerm
            ? data.filter(entry =>
                (entry.title && entry.title.toLowerCase().includes(searchTerm)) ||
                (entry.episodeTitle && entry.episodeTitle.toLowerCase().includes(searchTerm))
              )
            : data;

        const paginationContainer = document.getElementById(`pagination-${key}`);
        if (!filteredData || filteredData.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-sm col-span-full text-center">No hay contenido que coincida con la búsqueda.</p>`;
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE) || 1;
        let currentPage = paginationState[key] || 1;
        if (currentPage > totalPages) {
            currentPage = totalPages;
            paginationState[key] = currentPage;
        }
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedData = filteredData.slice(startIndex, endIndex);

        container.innerHTML = paginatedData.map(entry => {
            if (isFeaturedCard) return createFeaturedCardHTML(entry.item, sourceArrayName, entry.originalIndex, entry.tmdbData); 
            if (isEpisodeCard) return createEpisodeCardHTML(entry.item, sourceArrayName, entry.originalIndex, entry.episodeData, entry.seriesData);
            return createStandardCardHTML(entry.item, sourceArrayName, entry.originalIndex, entry.tmdbData);
        }).join('');

        renderPaginationControls(key, filteredData.length);
    };

    const renderSidebarNav = () => {
        sidebarNav.innerHTML = '';
        const dashboardLink = document.createElement('a');
        dashboardLink.dataset.key = 'all';
        dashboardLink.className = 'sidebar-link flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-slate-700/50 hover:text-white rounded-lg transition active cursor-pointer';
        dashboardLink.innerHTML = `<i class="fas fa-tachometer-alt w-5 text-center text-primary"></i><span>Dashboard</span>`;
        sidebarNav.appendChild(dashboardLink);

        if (dataStore.title || dataStore.globalDeveloperName) {
            const configLink = document.createElement('a');
            configLink.dataset.key = 'configuracion';
            configLink.className = 'sidebar-link flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-slate-700/50 hover:text-white rounded-lg transition cursor-pointer normal-content-section';
            configLink.innerHTML = `<i class="fas fa-cog w-5 text-center text-primary"></i><span>Configuración Global</span>`;
            sidebarNav.appendChild(configLink);
        }

        Object.keys(sectionTemplates).forEach(key => {
             if(key !== 'configuracion' && (dataStore[sectionTemplates[key].source] || !sectionTemplates[key].isSingle)) {
                const info = sectionTemplates[key];
                const link = document.createElement('a');
                link.dataset.key = key;
                link.className = 'sidebar-link flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-slate-700/50 hover:text-white rounded-lg transition cursor-pointer';
                if (info.isAdultSection) {
                   link.classList.add('adult-content-section');
                } else {
                   link.classList.add('normal-content-section');
                }
                link.innerHTML = `<i class="fas ${info.icon} w-5 text-center text-primary"></i><span>${info.title}</span>`;
                sidebarNav.appendChild(link);
             }
        });
    };
    
    const activateSidebarSection = (keyToShow) => {
        sidebarNav.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        const linkToActivate = sidebarNav.querySelector(`.sidebar-link[data-key="${keyToShow}"]`);
        if (linkToActivate) {
            linkToActivate.classList.add('active');
        }

        adminPanel.querySelectorAll('section').forEach(section => {
            section.style.display = 'none';
        });

        if (keyToShow === 'all') {
            headerTitle.innerHTML = '<i class="fas fa-tachometer-alt mr-3 text-primary"></i> Dashboard';
            globalSearchContainer.classList.add('hidden');
            adminPanelPlaceholder.style.display = 'block';
        } else if (keyToShow === 'configuracion') {
            headerTitle.innerHTML = '<i class="fas fa-cog mr-3 text-primary"></i> Configuración Global';
            globalSearchContainer.classList.add('hidden');
            adminPanelPlaceholder.style.display = 'none';
            const configSection = document.getElementById('section-configuracion');
            if (configSection) configSection.style.display = 'block';
        } else {
            const sectionInfo = sectionTemplates[keyToShow];
            headerTitle.innerHTML = `<i class="fas ${sectionInfo.icon} mr-3 text-primary"></i> ${sectionInfo.title}`;
            globalSearchContainer.classList.remove('hidden');
            globalSearchInput.placeholder = `Buscar en ${sectionInfo.title}...`;
            adminPanelPlaceholder.style.display = 'none';
            const section = document.getElementById(`section-${keyToShow}`);
            if(section) section.style.display = 'block';
        }
        globalSearchInput.value = '';
        rerenderSection(keyToShow);
    };

    const handleSidebarClick = (e) => {
        const link = e.target.closest('.sidebar-link');
        if (!link) return;
        
        if (window.innerWidth < 768) { // md breakpoint
            toggleSidebar();
        }
        activateSidebarSection(link.dataset.key);
    };

    // --- Lógica de Edición y CRUD ---
    const handleGlobalSearch = () => {
        const activeLink = sidebarNav.querySelector('.sidebar-link.active');
        if (activeLink) {
            const key = activeLink.dataset.key;
            if (key && key !== 'all' && key !== 'configuracion') {
                paginationState[key] = 1; // Reset to first page on search
                rerenderSection(key);
            }
        }
    };

    const openDeleteModal = (arrayName, index) => {
        confirmDeleteBtn.dataset.arrayName = arrayName;
        confirmDeleteBtn.dataset.index = index;
        openModal(confirmationModal);
    };

    const handleDeleteConfirmation = async () => {
        const { arrayName, index } = confirmDeleteBtn.dataset;
        if (arrayName && index !== undefined) {
            const numericIndex = parseInt(index);
            if (Array.isArray(dataStore[arrayName])) {
                dataStore[arrayName].splice(numericIndex, 1);

                const activeLink = sidebarNav.querySelector('.sidebar-link.active');
                if (activeLink) {
                    const key = activeLink.dataset.key;
                    if (key && key !== 'all') {
                        // Re-augment and re-render only the current section to keep the user on the same page
                        const sectionInfo = sectionTemplates[key];
                        const sourceArrayName = sectionInfo.source;
                        
                        const dataForSection = dataStore[sourceArrayName]
                            .map((item, i) => ({ item, originalIndex: i }))
                            .filter(entry => sectionInfo.filter(entry.item));

                        const augmentedData = await Promise.all(dataForSection.map(async (entry) => {
                            let tmdbData, episodeData, seriesData;
                            if (sectionInfo.isEpisodeCard) {
                                [episodeData, seriesData] = await Promise.all([
                                    fetchTMDBEpisodeData(entry.item.id, entry.item.season, entry.item.episode),
                                    fetchTMDBData(entry.item.id, entry.item.tipo)
                                ]);
                            } else {
                                tmdbData = await fetchTMDBData(entry.item.id, entry.item.tipo);
                            }
                            const title = tmdbData ? (tmdbData.title || tmdbData.name) : (seriesData ? seriesData.name : '');
                            const episodeTitle = episodeData ? `T${entry.item.season}:E${entry.item.episode} - ${episodeData.name}` : '';
                            return { ...entry, tmdbData, episodeData, seriesData, title, episodeTitle };
                        }));
                        augmentedDataStore[key] = augmentedData;
                        
                        rerenderSection(key);
                    }
                }
                
                updateHtmlOutput();
                showToast('Elemento eliminado.');
            }
            closeModal(confirmationModal);
        }
    };

    const fetchAllTMDBGenres = async () => {
        const apiKey = getApiKey();
        if (!apiKey) return [];
        try {
            const [movieResponse, tvResponse] = await Promise.all([
                fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=es-ES`),
                fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${apiKey}&language=es-ES`)
            ]);

            const movieData = await movieResponse.json();
            const tvData = await tvResponse.json();

            const tmdbGenres = [
                ...(movieData.genres ? movieData.genres.map(g => g.name.toLowerCase()) : []),
                ...(tvData.genres ? tvData.genres.map(g => g.name.toLowerCase()) : [])
            ];
            ALL_GENRES.tmdb = [...new Set(tmdbGenres)]; // Store unique TMDB genres
            return ALL_GENRES.tmdb;
        } catch (error) {
            console.error('Error fetching all TMDB genres:', error);
            return [];
        }
    };

    const fetchAllMyAnimeListGenres = async () => {
        try {
            const response = await fetch(`https://api.jikan.moe/v4/genres/anime`);
            if (!response.ok) throw new Error('Error fetching anime genres from MyAnimeList.');
            const data = await response.json();
            const malGenres = data.data.map(g => g.name.toLowerCase());
            ALL_GENRES.mal = [...new Set(malGenres)]; // Store unique MAL genres
            return ALL_GENRES.mal;
        } catch (error) {
            console.error('Error fetching all MyAnimeList genres:', error);
            return [];
        }
    };

    const fetchAllGenres = async () => {
        const [tmdb, mal] = await Promise.all([
            fetchAllTMDBGenres(),
            fetchAllMyAnimeListGenres()
        ]);
        
        // Combine and translate genres
        const combinedGenres = new Set();
        const genreTranslations = {
            // TMDB common genres (English) to Spanish
            'action': 'accion',
            'adventure': 'aventura',
            'comedy': 'comedia',
            'drama': 'drama',
            'fantasy': 'fantasia',
            'science fiction': 'ciencia ficcion',
            'sci-fi': 'ciencia ficcion',
            'mystery': 'misterio',
            'music': 'musica',
            'history': 'historico',
            'war': 'militar',
            'crime': 'policia',
            'thriller': 'terror',
            'romance': 'romance',
            'family': 'infantil',
            'animation': 'anime',
            'horror': 'terror',
            'tv movie': 'peliculas',
            'foreign': 'peliculas',
            'sport': 'deportes',
            'supernatural': 'sobrenatural',
            'cars': 'coches',
            'game': 'juegos',
            'kids': 'infantil',
            'parody': 'parodia',
            'suspense': 'suspenso', // Translated
            'survival': 'supervivencia',
            'award winning': 'premiado',
            'erotica': 'erotica',
            'super power': 'superpoderes',
            'martial arts': 'artes marciales',
            'magic': 'magia',
            'demons': 'demonios',
            'vampire': 'vampiros',
            'space': 'espacio',
            'school': 'escolar',
            'psychological': 'psicologico',
            'military': 'militar',
            'historical': 'historico',
            'video game': 'videojuegos',

            // MyAnimeList specific genres/themes (English/Japanese) to Spanish or kept as is
            'shounen': 'shounen',
            'shojo': 'shojo',
            'seinen': 'seinen',
            'josei': 'josei',
            'kodomomuke': 'kodomomuke',
            'mecha': 'mecha',
            'slice of life': 'slice of life',
            'dementia': 'demencia',
            'harem': 'harem',
            'ecchi': 'ecchi',
            'gourmet': 'gourmet',
            'reincarnation': 'reencarnacion',
            'isekai': 'isekai',
            'boys love': 'boys love',
            'girls love': 'girls love',
            'samurai': 'samurai',
            'hentai': 'Hentai',
            'anime': 'anime',
            'movies': 'peliculas',
            'tv': 'series',

            // New translations from user
            'acción': 'accion',
            'action & adventure': 'accion y aventura',
            'adult cast': 'reparto adulto',
            'animación': 'animacion',
            'anthropomorphic': 'antropomórfico',
            'avant garde': 'vanguardia',
            'bélica': 'belica',
            'cgdct': 'cgdct',
            'childcare': 'cuidado de niños',
            'ciencia ficción': 'ciencia ficcion',
            'combat sports': 'deportes de combate',
            'crimen': 'crimen',
            'crossdressing': 'travestismo',
            'delinquents': 'delincuentes',
            'detective': 'detective',
            'documental': 'documental',
            'educational': 'educativo',
            'fantasía': 'fantasia',
            'gag humor': 'humor de gags',
            'gore': 'gore',
            'high stakes game': 'juego de alto riesgo',
            'historia': 'historia',
            'idols (female)': 'idols (femeninas)',
            'idols (male)': 'idols (masculinos)',
            'iyashikei': 'iyashikei',
            'love polygon': 'polígono amoroso',
            'love status quo': 'status quo amoroso',
            'magical sex shift': 'cambio de sexo mágico',
            'mahou shoujo': 'mahou shoujo',
            'medical': 'médico',
            'mythology': 'mitología',
            'música': 'musica',
            'news': 'noticias',
            'organized crime': 'crimen organizado',
            'otaku culture': 'cultura otaku',
            'película de tv': 'pelicula de tv',
            'performing arts': 'artes escénicas',
            'pets': 'mascotas',
            'racing': 'carreras',
            'reality': 'reality',
            'reverse harem': 'harem inverso',
            'sci-fi & fantasy': 'ciencia ficción y fantasía',
            'showbiz': 'mundo del espectáculo',
            'soap': 'telenovela',
            'strategy game': 'juego de estrategia',
            'talk': 'charla',
            'team sports': 'deportes de equipo',
            'time travel': 'viaje en el tiempo',
            'urban fantasy': 'fantasía urbana',
            'villainess': 'villana',
            'visual arts': 'artes visuales',
            'war & politics': 'guerra y política',
            'western': 'western',
            'workplace': 'lugar de trabajo'
        };

        // Add all TMDB and MAL genres, applying translations
        [...tmdb, ...mal].forEach(genre => {
            const lowerCaseGenre = genre.toLowerCase();
            if (genreTranslations[lowerCaseGenre]) {
                combinedGenres.add(genreTranslations[lowerCaseGenre]);
            } else {
                combinedGenres.add(lowerCaseGenre);
            }
        });

        // Add any hardcoded categories that might not be covered by APIs (if any remain)
        // For now, PREDEFINED_CATEGORIES is empty, so this just ensures it's populated
        // with the fetched and translated genres.
        PREDEFINED_CATEGORIES = Array.from(combinedGenres).sort();
    };

    const mapGenresToPredefined = (genres) => {
        const mapped = new Set();
        const genreTranslations = {
            // TMDB common genres (English) to Spanish
            'action': 'accion',
            'adventure': 'aventura',
            'comedy': 'comedia',
            'drama': 'drama',
            'fantasy': 'fantasia',
            'science fiction': 'ciencia ficcion',
            'sci-fi': 'ciencia ficcion',
            'mystery': 'misterio',
            'music': 'musica',
            'history': 'historico',
            'war': 'militar',
            'crime': 'policia',
            'thriller': 'terror',
            'romance': 'romance',
            'family': 'infantil',
            'animation': 'anime',
            'horror': 'terror',
            'tv movie': 'peliculas',
            'foreign': 'peliculas',
            'sport': 'deportes',
            'supernatural': 'sobrenatural',
            'cars': 'coches',
            'game': 'juegos',
            'kids': 'infantil',
            'parody': 'parodia',
            'suspense': 'suspenso', // Translated
            'survival': 'supervivencia',
            'award winning': 'premiado',
            'erotica': 'erotica',
            'super power': 'superpoderes',
            'martial arts': 'artes marciales',
            'magic': 'magia',
            'demons': 'demonios',
            'vampire': 'vampiros',
            'space': 'espacio',
            'school': 'escolar',
            'psychological': 'psicologico',
            'military': 'militar',
            'historical': 'historico',
            'video game': 'videojuegos',

            // MyAnimeList specific genres/themes (English/Japanese) to Spanish or kept as is
            'shounen': 'shounen',
            'shojo': 'shojo',
            'seinen': 'seinen',
            'josei': 'josei',
            'kodomomuke': 'kodomomuke',
            'mecha': 'mecha',
            'slice of life': 'slice of life',
            'dementia': 'demencia',
            'harem': 'harem',
            'ecchi': 'ecchi',
            'gourmet': 'gourmet',
            'reincarnation': 'reencarnacion',
            'isekai': 'isekai',
            'boys love': 'boys love',
            'girls love': 'girls love',
            'samurai': 'samurai',
            'hentai': 'Hentai',
            'anime': 'anime',
            'movies': 'peliculas',
            'tv': 'series',

            // New translations from user
            'acción': 'accion',
            'action & adventure': 'accion y aventura',
            'adult cast': 'reparto adulto',
            'animación': 'animacion',
            'anthropomorphic': 'antropomórfico',
            'avant garde': 'vanguardia',
            'bélica': 'belica',
            'cgdct': 'cgdct',
            'childcare': 'cuidado de niños',
            'ciencia ficción': 'ciencia ficcion',
            'combat sports': 'deportes de combate',
            'crimen': 'crimen',
            'crossdressing': 'travestismo',
            'delinquents': 'delincuentes',
            'detective': 'detective',
            'documental': 'documental',
            'educational': 'educativo',
            'fantasía': 'fantasia',
            'gag humor': 'humor de gags',
            'gore': 'gore',
            'high stakes game': 'juego de alto riesgo',
            'historia': 'historia',
            'idols (female)': 'idols (femeninas)',
            'idols (male)': 'idols (masculinos)',
            'iyashikei': 'iyashikei',
            'love polygon': 'polígono amoroso',
            'love status quo': 'status quo amoroso',
            'magical sex shift': 'cambio de sexo mágico',
            'mahou shoujo': 'mahou shoujo',
            'medical': 'médico',
            'mythology': 'mitología',
            'música': 'musica',
            'news': 'noticias',
            'organized crime': 'crimen organizado',
            'otaku culture': 'cultura otaku',
            'película de tv': 'pelicula de tv',
            'performing arts': 'artes escénicas',
            'pets': 'mascotas',
            'racing': 'carreras',
            'reality': 'reality',
            'reverse harem': 'harem inverso',
            'sci-fi & fantasy': 'ciencia ficción y fantasía',
            'showbiz': 'mundo del espectáculo',
            'soap': 'telenovela',
            'strategy game': 'juego de estrategia',
            'talk': 'charla',
            'team sports': 'deportes de equipo',
            'time travel': 'viaje en el tiempo',
            'urban fantasy': 'fantasía urbana',
            'villainess': 'villana',
            'visual arts': 'artes visuales',
            'war & politics': 'guerra y política',
            'western': 'western',
            'workplace': 'lugar de trabajo'
        };

        genres.forEach(genre => {
            const lowerCaseGenre = genre.toLowerCase();
            if (genreTranslations[lowerCaseGenre]) {
                mapped.add(genreTranslations[lowerCaseGenre]);
            } else if (PREDEFINED_CATEGORIES.includes(lowerCaseGenre)) {
                mapped.add(lowerCaseGenre);
            }
        });
        return Array.from(mapped);
    };

    const fetchMyAnimeListGenresByName = async (title) => {
        if (!title) return { mal_id: undefined, genres: [] };
        try {
            // 1. Search for the anime by title
            const searchResponse = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`);
            if (!searchResponse.ok) throw new Error('Error searching on MyAnimeList.');
            const searchData = await searchResponse.json();
            if (!searchData.data || searchData.data.length === 0) {
                console.log(`No results found on MyAnimeList for "${title}".`);
                return { mal_id: undefined, genres: [] };
            }
            const mal_id = searchData.data[0].mal_id;

            // 2. Fetch genres using the found mal_id
            const { genres } = await fetchMyAnimeListGenresById(mal_id);
            return { mal_id, genres };
        } catch (error) {
            console.error('Error fetching MyAnimeList data by name:', error);
            return { mal_id: undefined, genres: [] };
        }
    };

    const handleAdminPanelClick = (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        if (btn.classList.contains('toggle-visibility-btn')) {
            const container = btn.closest('.sensitive-content-container');
            if (container) {
                const featuredOverlay = container.querySelector('.featured-blur-overlay');
                if (featuredOverlay) {
                    featuredOverlay.classList.toggle('hidden');
                    btn.innerHTML = featuredOverlay.classList.contains('hidden') ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
                } else {
                    // Existing logic for episode and standard cards
                    const img = container.querySelector('img');
                    img.classList.toggle('blurred');
                    btn.innerHTML = img.classList.contains('blurred') ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
                }
            }
            return;
        }

        // Handle pagination clicks
        if (btn.classList.contains('pagination-btn')) {
            const { sectionKey, page } = btn.dataset;
            paginationState[sectionKey] = parseInt(page);
            rerenderSection(sectionKey);
            return;
        }

        // Handle CRUD clicks
        const { arrayName, index, sectionKey } = btn.dataset;
        if (btn.classList.contains('add-btn')) openEditModal(sectionKey);
        if (btn.classList.contains('edit-btn')) openEditModal(arrayName, parseInt(index));
        if (btn.classList.contains('delete-btn')) {
            openDeleteModal(arrayName, parseInt(index));
        }
    };

    const openEditModal = async (sectionKeyOrArrayName, index = -1) => {
        const modalLoader = document.getElementById('modal-loader');
        
        editForm.reset();
        editForm.classList.add('hidden');
        modalLoader.classList.remove('hidden'); // Show loader immediately
        openModal(modal);

        // Run the data fetching and form population asynchronously
        const isNew = index === -1;
        let arrayName, data = {};
        const modalEpisodeDetails = document.getElementById('modal-episode-details');
            const modalIdInput = document.getElementById('modal-id');
            const modalMalIdInput = document.getElementById('modal-mal-id');
            const modalTipoSelect = document.getElementById('modal-tipo');
            const modalIsAdultCheckbox = document.getElementById('modal-isAdult');
            const modalCustomCategoriesInput = document.getElementById('modal-categoria-custom');
            const modalCategoriesGroup = document.getElementById('modal-categories-group');
            const modalMalIdGroup = document.getElementById('modal-mal-id-group');
            const categorySearchInput = document.getElementById('category-search-input');
            
            const modalCustomTitleInput = document.getElementById('modal-customTitle');
            const modalCustomTitleToggle = document.getElementById('modal-customTitle-toggle');
            const modalCustomTitleGroup = document.getElementById('modal-customTitle-group');

            const modalCustomLogoUrlInput = document.getElementById('modal-customLogoUrl');
            const modalCustomLogoUrlToggle = document.getElementById('modal-customLogoUrl-toggle');
            const modalCustomLogoUrlGroup = document.getElementById('modal-customLogoUrl-group');

            // Reset categories
            document.querySelectorAll('input[name="predefined_category"]').forEach(cb => cb.checked = false);
            modalCustomCategoriesInput.value = '';
            initializeCategoryCheckboxes(); // Re-render with current PREDEFINED_CATEGORIES

            modalTipoSelect.disabled = false;
            modalIsAdultCheckbox.disabled = false;
            modalEpisodeDetails.classList.add('hidden');
            modalCategoriesGroup.classList.remove('hidden'); // Ensure visible by default
            modalMalIdGroup.classList.remove('hidden'); // Ensure visible by default
            
            // Ensure groups are visible and toggles are enabled by default
            modalCustomTitleGroup.classList.remove('hidden');
            modalCustomLogoUrlGroup.classList.remove('hidden');
            modalCustomTitleToggle.disabled = false;
            modalCustomLogoUrlToggle.disabled = false;

            if (isNew) {
                const sectionKey = sectionKeyOrArrayName;
                const sectionInfo = sectionTemplates[sectionKey];
                document.getElementById('modalTitle').textContent = `Añadir a ${sectionInfo.title}`;

                if (sectionKey === 'latestEpisodes') {
                    arrayName = 'latestEpisodes';
                    data = { tipo: 'tv', isAdult: false };
                    modalEpisodeDetails.classList.remove('hidden');
                    modalTipoSelect.value = 'tv';
                    modalTipoSelect.disabled = true;
                    modalIsAdultCheckbox.checked = false;
                    modalIsAdultCheckbox.disabled = true;
                } else if (sectionKey === 'latestEpisodes18') {
                    arrayName = 'latestEpisodes';
                    data = { tipo: 'tv', isAdult: true };
                    modalEpisodeDetails.classList.remove('hidden');
                    modalTipoSelect.value = 'tv';
                    modalTipoSelect.disabled = true;
                    modalIsAdultCheckbox.checked = true;
                    modalIsAdultCheckbox.disabled = true;
                } else {
                    arrayName = 'contentDefinitionsFromDb';
                    if (sectionKey === 'peliculas') data = { tipo: 'movie', isAdult: false, categoria: ['home'] };
                    else if (sectionKey === 'series') data = { tipo: 'tv', isAdult: false, categoria: ['home'] };
                    else if (sectionKey === 'peliculas18') data = { tipo: 'movie', isAdult: true, categoria: ['home'] };
                    else if (sectionKey === 'series18') data = { tipo: 'tv', isAdult: true, categoria: ['home'] };
                    else data = { categoria: ['home'] }; // Default for other new content
                    modalTipoSelect.disabled = false; // Allow changing type for new standard content
                    modalIsAdultCheckbox.disabled = false; // Allow changing adult status for new standard content
                }
                
                // Disable and hide customLogoUrl for featured content when adding new
                if (sectionKey === 'explosivoContent' || sectionKey === 'secicondEdestacadoContent') {
                    modalCustomLogoUrlGroup.classList.add('hidden');
                    modalCustomLogoUrlToggle.disabled = true;
                    modalCategoriesGroup.classList.add('hidden'); // Hide categories for featured
                    modalMalIdGroup.classList.add('hidden'); // Hide MAL ID for featured
                }
                // Disable and hide customTitle and customLogoUrl for latest episodes content when adding new
                if (sectionKey === 'latestEpisodes' || sectionKey === 'latestEpisodes18') {
                    modalCustomTitleGroup.classList.add('hidden');
                    modalCustomTitleToggle.disabled = true;
                    modalCustomLogoUrlGroup.classList.add('hidden');
                    modalCustomLogoUrlToggle.disabled = true;
                    modalCategoriesGroup.classList.add('hidden'); // Hide categories for latest episodes
                    modalMalIdGroup.classList.add('hidden'); // Hide MAL ID for latest episodes
                }

            } else {
                arrayName = sectionKeyOrArrayName;
                data = Array.isArray(dataStore[arrayName]) ? dataStore[arrayName][index] : dataStore[arrayName];
                document.getElementById('modalTitle').textContent = 'Editar Contenido';
                if (arrayName === 'latestEpisodes') {
                    modalEpisodeDetails.classList.remove('hidden');
                }

                // Disable and hide customLogoUrl for featured content when editing existing
                if (arrayName === 'explosivoContent' || arrayName === 'secicondEdestacadoContent') {
                    modalCustomLogoUrlGroup.classList.add('hidden');
                    modalCustomLogoUrlToggle.disabled = true;
                    modalCategoriesGroup.classList.add('hidden'); // Hide categories for featured
                    modalMalIdGroup.classList.add('hidden'); // Hide MAL ID for featured
                }
                // Disable and hide customTitle and customLogoUrl for latest episodes content when editing existing
                if (arrayName === 'latestEpisodes') {
                    modalCustomTitleGroup.classList.add('hidden');
                    modalCustomTitleToggle.disabled = true;
                    modalCustomLogoUrlGroup.classList.add('hidden');
                    modalCustomLogoUrlToggle.disabled = true;
                    modalCategoriesGroup.classList.add('hidden'); // Hide categories for latest episodes
                    modalMalIdGroup.classList.add('hidden'); // Hide MAL ID for latest episodes
                }
            }
            
            document.getElementById('modal-array-name').value = arrayName;
            document.getElementById('modal-index').value = index;
            
            // Initialize mal_id
            modalMalIdInput.value = data.mal_id || '';

            // Initialize toggle states and input visibility based on existing data
            modalCustomTitleToggle.checked = !!data.customTitle;
            modalCustomTitleInput.classList.toggle('hidden', !modalCustomTitleToggle.checked);
            modalCustomLogoUrlToggle.checked = !!data.customLogoUrl;
            modalCustomLogoUrlInput.classList.toggle('hidden', !modalCustomLogoUrlToggle.checked);

            Object.keys(data).forEach(key => {
                const el = document.getElementById(`modal-${key}`);
                if (el) {
                    if (el.type === 'checkbox') el.checked = data[key];
                    else el.value = data[key];
                }
            });
            
            document.getElementById('modal-customTitle').value = data.customTitle || '';
            document.getElementById('modal-customLogoUrl').value = data.customLogoUrl || '';

            // Add event listeners for toggles
            modalCustomTitleToggle.onchange = () => {
                modalCustomTitleInput.classList.toggle('hidden', !modalCustomTitleToggle.checked);
                if (!modalCustomTitleToggle.checked) modalCustomTitleInput.value = '';
            };
            modalCustomLogoUrlToggle.onchange = () => {
                modalCustomLogoUrlInput.classList.toggle('hidden', !modalCustomLogoUrlToggle.checked);
                if (!modalCustomLogoUrlToggle.checked) modalCustomLogoUrlInput.value = '';
            };

            // Store original categories to merge with TMDB ones
            let originalCategories = data.categoria && Array.isArray(data.categoria) ? [...data.categoria] : [];
            
            // NOTE: The MyAnimeList ID is fetched automatically when a TMDB ID is entered.
            const fetchAndApplyGenres = async () => {
                console.log("fetchAndApplyGenres called");
                const id = parseInt(modalIdInput.value);
                let malId = parseInt(modalMalIdInput.value);
                const tipo = modalTipoSelect.value;
                console.log("TMDB ID:", id, "Type:", tipo);

                let tmdbGenres = [];
                let malGenres = [];
                let tmdbTitle = '';

                // Always try to fetch TMDB data if ID and type are present
                if (id && tipo) {
                    console.log("Fetching TMDB data...");
                    const tmdbData = await fetchTMDBData(id, tipo);
                    if (tmdbData) {
                        tmdbTitle = tmdbData.title || tmdbData.name;
                        console.log("TMDB Title:", tmdbTitle);
                        // Fetch TMDB genres only for 'movie' or 'tv'
                        if ((tipo === 'movie' || tipo === 'tv') && tmdbData.genres) {
                            const rawTmdbGenres = tmdbData.genres.map(genre => genre.name.toLowerCase());
                            tmdbGenres = mapGenresToPredefined(rawTmdbGenres);
                        }
                    }
                }
                
                // Prioritize malId if explicitly provided
                if (malId) {
                    console.log("MAL ID provided, fetching genres for MAL ID:", malId);
                    const { genres: rawMalGenres } = await fetchMyAnimeListGenresById(malId);
                    malGenres = mapGenresToPredefined(rawMalGenres);
                } else if (tmdbTitle) { // If no malId, try to get it from TMDB title
                    console.log("No MAL ID, fetching from TMDB title:", tmdbTitle);
                    const { mal_id: fetchedMalId, genres: rawMalGenres } = await fetchMyAnimeListGenresByName(tmdbTitle);
                    if (fetchedMalId) {
                        malId = fetchedMalId;
                        modalMalIdInput.value = malId; // Populate mal_id input
                        console.log("Fetched MAL ID:", malId);
                    }
                    malGenres = mapGenresToPredefined(rawMalGenres);
                }
                
                const allFetchedGenres = [...new Set([...tmdbGenres, ...malGenres])];
                const allGenres = new Set([...PREDEFINED_CATEGORIES, ...allFetchedGenres]);
                PREDEFINED_CATEGORIES = Array.from(allGenres).sort();
                
                const genresToSelect = [...new Set([...originalCategories, ...allFetchedGenres])];
                initializeCategoryCheckboxes(genresToSelect);

                const currentSelectedCheckboxes = Array.from(document.querySelectorAll('input[name="predefined_category"]:checked')).map(cb => cb.value);
                const customCategories = originalCategories.filter(cat => 
                    !PREDEFINED_CATEGORIES.includes(cat) && !currentSelectedCheckboxes.includes(cat)
                );
                modalCustomCategoriesInput.value = customCategories.join(', ');
            };

            // Only call fetchAndApplyGenres if not a featured or latest episodes section
            const currentArrayName = isNew ? sectionKeyOrArrayName : arrayName;
            const isFeaturedOrLatest = ['explosivoContent', 'secicondEdestacadoContent', 'latestEpisodes', 'latestEpisodes18'].includes(currentArrayName);

            if (!isFeaturedOrLatest) {
                await fetchAndApplyGenres();
                modalIdInput.oninput = fetchAndApplyGenres;
                modalMalIdInput.oninput = fetchAndApplyGenres;
                modalTipoSelect.onchange = fetchAndApplyGenres;

                // Add search functionality for categories
                categorySearchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    const labels = document.querySelectorAll('#predefined-categories-list label');
                    labels.forEach(label => {
                        const categoryName = label.querySelector('span').textContent.toLowerCase();
                        if (categoryName.includes(searchTerm)) {
                            label.style.display = 'flex';
                        } else {
                            label.style.display = 'none';
                        }
                    });
                });
            } else {
                // For featured and latest episodes, ensure categories and MAL ID are cleared/hidden
                modalMalIdInput.value = '';
                modalCustomCategoriesInput.value = '';
                initializeCategoryCheckboxes([]); // Clear all checkboxes
                modalCategoriesGroup.classList.add('hidden');
                modalMalIdGroup.classList.add('hidden');
            }
            
            document.getElementById('modal-customUrl').value = data.customUrl || data.url || data.watchUrl || data.infoUrl || '';
            
            // Hide loader and show form
            modalLoader.classList.add('hidden');
            editForm.classList.remove('hidden');
        // No setTimeout needed here, as the loader is shown immediately
    };
    
    const handleFormSubmit = async (e) => {
        e.preventDefault();

        const arrayName = document.getElementById('modal-array-name').value;
        const index = parseInt(document.getElementById('modal-index').value);
        const isNew = index === -1;

        let item;
        if (isNew) {
            item = {};
        } else {
            if (Array.isArray(dataStore[arrayName])) {
                item = dataStore[arrayName][index];
            } else {
                item = dataStore[arrayName];
            }
        }

        item.id = parseInt(document.getElementById('modal-id').value);
        item.tipo = document.getElementById('modal-tipo').value;
        item.isAdult = document.getElementById('modal-isAdult').checked;
        item.customUrl = document.getElementById('modal-customUrl').value;
        
        // Only set mal_id and categoria if not a featured or latest episodes section
        const isFeaturedOrLatest = ['explosivoContent', 'secicondEdestacadoContent', 'latestEpisodes', 'latestEpisodes18'].includes(arrayName);
        if (!isFeaturedOrLatest) {
            item.mal_id = parseInt(document.getElementById('modal-mal-id').value) || undefined;
            let selectedCategories = Array.from(document.querySelectorAll('input[name="predefined_category"]:checked')).map(cb => cb.value);
            const customCategories = document.getElementById('modal-categoria-custom').value.split(',').map(s => s.trim()).filter(Boolean);
            item.categoria = [...new Set([...selectedCategories, ...customCategories])];
        } else {
            delete item.mal_id;
            delete item.categoria;
        }

        // Conditionally add or delete customTitle
        if (document.getElementById('modal-customTitle-toggle').checked) {
            item.customTitle = document.getElementById('modal-customTitle').value;
        } else {
            delete item.customTitle;
        }
        // Conditionally add or delete customLogoUrl
        if (document.getElementById('modal-customLogoUrl-toggle').checked) {
            item.customLogoUrl = document.getElementById('modal-customLogoUrl').value;
        } else {
            delete item.customLogoUrl;
        }

        if (arrayName === 'latestEpisodes') {
            item.season = parseInt(document.getElementById('modal-season').value);
            item.episode = parseInt(document.getElementById('modal-episode').value);
            item.tipo = 'tv';
        }
        
        if (item.id && !await fetchTMDBData(item.id, item.tipo)) {
            return; // fetchTMDBData already shows a toast on error
        }

        if (isNew) { 
            if (!dataStore[arrayName]) dataStore[arrayName] = [];
            dataStore[arrayName].push(item);
        }
        
        closeModal(modal);
        
        // Get the currently active sidebar link's key before re-rendering
        const activeLinkBeforeSave = sidebarNav.querySelector('.sidebar-link.active');
        const activeKeyBeforeSave = activeLinkBeforeSave ? activeLinkBeforeSave.dataset.key : 'all';

        await renderAdminPanel(); // Await the full re-rendering and data augmentation
        renderSidebarNav(); // Re-render sidebar nav to ensure it's up-to-date
        updateHtmlOutput();
        showToast('Contenido guardado.');

        // Re-activate the previously active sidebar link to stay on the same section
        activateSidebarSection(activeKeyBeforeSave);
    };
    
    // --- Generación y Copia de HTML Final ---
    const updateHtmlOutput = () => {
        if (!htmlTemplateBase) {
            showToast('No se ha cargado un HTML base para generar.', true);
            return '';
        }
        console.log("htmlTemplateBase:", htmlTemplateBase);

        let generatedHtml = htmlTemplateBase;
        
        // Restore title
        generatedHtml = generatedHtml.replace(/<title>[\s\S]*?<\/title>/, `<title>${dataStore.title || ''}</title>`);

        // Define the styles to inject
        const stylesToInject = `
        html, body {
            background-color: #111827; /* bg-gray-900 */
            font-family: 'Inter', sans-serif;
        }

`;
        // Check if a <style> tag already exists in the head
        const styleTagRegex = /(<style[^>]*>)([\s\S]*?)(<\/style>)/i;
        const headTagRegex = /(<head[^>]*>)([\s\S]*?)(<\/head>)/i;

        if (generatedHtml.match(styleTagRegex)) {
            // If a style tag exists, insert styles inside it
            generatedHtml = generatedHtml.replace(styleTagRegex, (match, openTag, content, closeTag) => {
                return `${openTag}${content}\n${stylesToInject}${closeTag}`;
            });
        } else if (generatedHtml.match(headTagRegex)) {
            // If no style tag but a head tag exists, create a new style tag inside head
            generatedHtml = generatedHtml.replace(headTagRegex, (match, openTag, content, closeTag) => {
                return `${openTag}${content}\n    <style>${stylesToInject}</style>\n${closeTag}`;
            });
        } else {
            // Fallback if no head tag is found, prepend to the document
            generatedHtml = `<head>\n    <style>${stylesToInject}</style>\n</head>\n` + generatedHtml;
        }

        let scriptToInject = '';

        // Re-create script content
        const orderedKeys = [
            'contentDefinitionsFromDb', 'latestEpisodes', 'explosivoContent', 'secicondEdestacadoContent',
            'globalBannerUrl', 'globalProfileGifUrl', 'globalDeveloperName', 'globalAppVersion'
        ];

        orderedKeys.forEach(key => {
            if (dataStore[key] !== undefined) {
                let dataString;
                const data = dataStore[key];
                if (Array.isArray(data) && (key === 'contentDefinitionsFromDb' || key === 'latestEpisodes')) {
                     const items = data.map(item => `    ${JSON.stringify(item)}`).join(',\n');
                     dataString = `[\n${items}\n  ]`;
                } else {
                    dataString = JSON.stringify(data, null, 2);
                }
                scriptToInject += `\n      window.${key} = ${dataString};`;
            }
        });

        if (scriptToInject) {
            const scriptBlock = `<script id="yami-lat-data">${scriptToInject}\n      <\\/script>`;
            
            if (generatedHtml.includes('<!-- YamiLat Data Placeholder -->')) {
                generatedHtml = generatedHtml.replace('<!-- YamiLat Data Placeholder -->', scriptBlock);
            } else {
                const bodyEndIndex = generatedHtml.lastIndexOf('</body>');
                console.log("bodyEndIndex:", bodyEndIndex);
                if (bodyEndIndex !== -1) {
                    // Clean up any empty script tags that might be left from the initial processing
                    const cleanedBody = generatedHtml.substring(0, bodyEndIndex).replace(/<script>\s*<\/script>/gi, '');
                    console.log("cleanedBody:", cleanedBody);
                    const bodyEnd = generatedHtml.substring(bodyEndIndex);
                    console.log("bodyEnd:", bodyEnd);
                    generatedHtml = cleanedBody + scriptBlock + '\n' + bodyEnd;
                } else {
                    generatedHtml += scriptBlock;
                }
            }
        }
        
        if (loaderTemplate) {
            const escapedGeneratedHtml = generatedHtml.replace(/`/g, '\`');
            const finalLoader = loaderTemplate.replace(/const indexHtmlContent = `([\s\S]*)`;/, `const indexHtmlContent = \`${escapedGeneratedHtml}\`;`);
            return finalLoader;
        }

        return generatedHtml;
    };

    const generateAndShowHtml = () => {
        const finalHtml = updateHtmlOutput(); // Get the dynamically generated HTML
        console.log("Generated HTML:", finalHtml);
        if (!finalHtml) return; // updateHtmlOutput will show toast if no template
        document.getElementById('generatedHtmlOutput').value = finalHtml;
        openModal(generateHtmlModal);
    };
    
    const copyGeneratedHtml = () => {
        const output = document.getElementById('generatedHtmlOutput');
        output.focus();
        output.select();
        output.setSelectionRange(0, output.value.length);

        const onCopySuccess = () => {
            showToast('¡Código copiado al portapapeles!');
            copyGeneratedHtmlBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Copiado!';
            copyGeneratedHtmlBtn.disabled = true;
            setTimeout(() => {
                copyGeneratedHtmlBtn.innerHTML = '<i class="fas fa-copy mr-2"></i>Copiar al Portapapeles';
                copyGeneratedHtmlBtn.disabled = false;
            }, 2000);
        };

        const onCopyError = (err) => {
            showToast('Error al copiar el código.', true);
            console.error('Error al copiar:', err);
        };

        if (navigator.clipboard) {
            navigator.clipboard.writeText(output.value).then(onCopySuccess).catch(onCopyError);
        } else {
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    onCopySuccess();
                } else {
                    onCopyError('document.execCommand failed');
                }
            } catch (err) {
                onCopyError(err);
            }
        }
    };

    // --- Event Listeners Setup ---
    const setupEventListeners = () => {
        modeNormalBtn.addEventListener('click', () => setMode(false));
        modeAdultBtn.addEventListener('click', () => setMode(true));
        mobileMenuBtn.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);
        openLoadModalBtn.addEventListener('click', () => openModal(loadHtmlModal));
        cancelLoadBtn.addEventListener('click', () => closeModal(loadHtmlModal));
        closeGeneratedHtmlBtn.addEventListener('click', () => closeModal(generateHtmlModal));
        processHtmlBtn.addEventListener('click', processHtml);
        sidebarNav.addEventListener('click', handleSidebarClick);
        adminPanel.addEventListener('click', handleAdminPanelClick);
        globalSearchInput.addEventListener('input', handleGlobalSearch);
        cancelBtn.addEventListener('click', () => closeModal(modal));
        modalBackBtn.addEventListener('click', () => closeModal(modal));
        editForm.addEventListener('submit', handleFormSubmit);
        generateHtmlBtn.addEventListener('click', generateAndShowHtml);
        copyGeneratedHtmlBtn.addEventListener('click', copyGeneratedHtml);

        // Delete confirmation modal
        cancelDeleteBtn.addEventListener('click', () => closeModal(confirmationModal));
        confirmDeleteBtn.addEventListener('click', handleDeleteConfirmation);

        // Copy Categories button
        const copyCategoriesBtn = document.getElementById('copyCategoriesBtn');
        if (copyCategoriesBtn) {
            copyCategoriesBtn.addEventListener('click', () => {
                const selectedCategories = Array.from(document.querySelectorAll('input[name="predefined_category"]:checked'))
                                            .map(cb => cb.value);
                const customCategories = document.getElementById('modal-categoria-custom').value
                                            .split(',')
                                            .map(s => s.trim())
                                            .filter(Boolean);
                const allCategories = [...new Set([...selectedCategories, ...customCategories])];
                const filteredCategories = allCategories.filter(cat => cat.toLowerCase() !== 'home'); // Filter out 'home'
                const categoriesString = filteredCategories.join(', ');

                console.log('Selected Categories:', selectedCategories);
                console.log('Custom Categories:', customCategories);
                console.log('All Categories (before filter):', allCategories);
                console.log('Filtered Categories (excluding "home"):', filteredCategories);
                console.log('Categories String to copy:', categoriesString);

                if (navigator.clipboard) {
                    navigator.clipboard.writeText(categoriesString).then(() => {
                        showToast('Categorías copiadas al portapapeles.');
                        copyCategoriesBtn.innerHTML = '<i class="fas fa-check mr-1"></i> Copiado!';
                        setTimeout(() => {
                            copyCategoriesBtn.innerHTML = '<i class="fas fa-copy mr-1"></i> Copiar Categorías';
                        }, 2000);
                    }).catch(err => {
                        showToast('Error al copiar las categorías.', true);
                        console.error('Error al copiar:', err);
                    });
                } else {
                    // Fallback for browsers that don't support navigator.clipboard
                    const textarea = document.createElement('textarea');
                    textarea.value = categoriesString;
                    document.body.appendChild(textarea);
                    textarea.select();
                    try {
                        document.execCommand('copy');
                        showToast('Categorías copiadas al portapapeles.');
                        copyCategoriesBtn.innerHTML = '<i class="fas fa-check mr-1"></i> Copiado!';
                        setTimeout(() => {
                            copyCategoriesBtn.innerHTML = '<i class="fas fa-copy mr-1"></i> Copiar Categorías';
                        }, 2000);
                    } catch (err) {
                        showToast('Error al copiar las categorías.', true);
                        console.error('Error al copiar:', err);
                    }
                    document.body.removeChild(textarea);
                }
            });
        }

        const editConfigModal = document.getElementById('editConfigModal');
        if (editConfigModal) {
            document.getElementById('saveConfigEditBtn').addEventListener('click', saveConfigEdit);
            editConfigModal.querySelector('.modal-back-btn').addEventListener('click', () => closeModal(editConfigModal));
            document.getElementById('cancelConfigEditBtn').addEventListener('click', () => closeModal(editConfigModal));
        }
    };

    // --- Initialize ---
    initializeApp();
});
