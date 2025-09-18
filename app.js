// NASA API Explorer
// API Key - En producción, esto debería estar en el servidor
const NASA_API_KEY = 'b3Df0cLQrSQeh9KhH1fnHEzJxNgqf8HIReK99hf8'; // Usa 'DEMO_KEY' para pruebas limitadas

// URLs de las APIs de la NASA
const NASA_APIS = {
    APOD: 'https://api.nasa.gov/planetary/apod',
    ASTEROIDS: 'https://api.nasa.gov/neo/rest/v1/feed',
    MARS_ROVER: 'https://api.nasa.gov/mars-photos/api/v1/rovers',
    EPIC: 'https://epic.gsfc.nasa.gov/api'
};

// Elementos del DOM
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');

// Variables de paginación
let paginationState = {
    mars: {
        currentPage: 1,
        itemsPerPage: 12,
        totalItems: 0,
        allPhotos: []
    },
    asteroids: {
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 0,
        allAsteroids: []
    }
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setDefaultDates();
    setupConnectionMonitor();
    showWelcomeMessage(); // Mostrar mensaje de bienvenida en lugar de cargar APOD automáticamente
});

function showWelcomeMessage() {
    const content = document.getElementById('apod-content');
    content.innerHTML = `
        <div class="text-center py-12">
            <div class="text-6xl mb-4">🌌</div>
            <h3 class="text-2xl font-bold text-blue-300 mb-4">Bienvenido a APOD</h3>
            <p class="text-gray-300 mb-6 max-w-2xl mx-auto">
                Descubre la imagen astronómica del día de la NASA. Selecciona una fecha y haz clic en 
                "📸 Obtener Imagen" para explorar el universo.
            </p>
            <button onclick="loadAPOD()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors">
                🚀 Ver imagen de hoy
            </button>
        </div>
    `;
}

function initializeApp() {
    console.log('NASA API Explorer iniciado');
}

// Monitor de conexión
function setupConnectionMonitor() {
    // Crear indicador de estado de conexión
    const connectionStatus = document.createElement('div');
    connectionStatus.id = 'connection-status';
    connectionStatus.className = 'connection-status hidden';
    document.body.appendChild(connectionStatus);
    
    // Monitorear estado de conexión
    function updateConnectionStatus() {
        const status = navigator.onLine;
        const statusElement = document.getElementById('connection-status');
        
        if (status) {
            statusElement.textContent = '🟢 Conectado';
            statusElement.className = 'connection-status online';
            setTimeout(() => statusElement.classList.add('hidden'), 2000);
        } else {
            statusElement.textContent = '🔴 Sin conexión';
            statusElement.className = 'connection-status offline';
            statusElement.classList.remove('hidden');
        }
    }
    
    // Event listeners para cambios de conexión
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    
    // Verificar conexión inicial
    updateConnectionStatus();
}

function setupEventListeners() {
    // Navigation tabs
    document.getElementById('apod-tab').addEventListener('click', () => showSection('apod'));
    document.getElementById('asteroids-tab').addEventListener('click', () => showSection('asteroids'));
    document.getElementById('mars-tab').addEventListener('click', () => showSection('mars'));
    document.getElementById('earth-tab').addEventListener('click', () => showSection('earth'));

    // API buttons
    document.getElementById('get-apod').addEventListener('click', loadAPOD);
    document.getElementById('retry-apod').addEventListener('click', retryAPOD);
    document.getElementById('get-asteroids').addEventListener('click', loadAsteroids);
    document.getElementById('get-mars-photos').addEventListener('click', loadMarsPhotos);
    document.getElementById('get-earth-image').addEventListener('click', loadEPICImages);
    
    // Pagination controls
    document.getElementById('asteroids-per-page').addEventListener('change', function() {
        paginationState.asteroids.itemsPerPage = parseInt(this.value);
        if (paginationState.asteroids.allAsteroids.length > 0) {
            displayAsteroidsPage(1);
        }
    });
    
    document.getElementById('photos-per-page').addEventListener('change', function() {
        paginationState.mars.itemsPerPage = parseInt(this.value);
        if (paginationState.mars.allPhotos.length > 0) {
            displayMarsPhotosPage(1);
        }
    });
}

function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    document.getElementById('apod-date').value = today;
    document.getElementById('start-date').value = weekAgo;
    document.getElementById('end-date').value = today;
    document.getElementById('earth-date').value = today;
}

function showSection(sectionName) {
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Mostrar la sección seleccionada
    document.getElementById(`${sectionName}-section`).classList.remove('hidden');
    
    // Actualizar tabs
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'active');
        btn.classList.add('bg-gray-600');
    });
    
    document.getElementById(`${sectionName}-tab`).classList.remove('bg-gray-600');
    document.getElementById(`${sectionName}-tab`).classList.add('bg-blue-600', 'active');
}

function showLoading() {
    loading.classList.remove('hidden');
    hideError();
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
    hideLoading();
}

function hideError() {
    errorMessage.classList.add('hidden');
}

// Funciones de paginación
function createPaginationControls(section, currentPage, totalPages, onPageChange) {
    if (totalPages <= 1) return '';
    
    const paginationHTML = `
        <div class="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-2 mt-6 pagination-controls">
            <div class="flex items-center space-x-2">
                <button 
                    onclick="${onPageChange}(1)" 
                    ${currentPage <= 1 ? 'disabled' : ''}
                    class="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">
                    ⇤ Inicio
                </button>
                <button 
                    onclick="${onPageChange}(${currentPage - 1})" 
                    ${currentPage <= 1 ? 'disabled' : ''}
                    class="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    ← Anterior
                </button>
            </div>
            
            <div class="flex space-x-1">
                ${generatePageNumbers(currentPage, totalPages, onPageChange)}
            </div>
            
            <div class="flex items-center space-x-2">
                <button 
                    onclick="${onPageChange}(${currentPage + 1})" 
                    ${currentPage >= totalPages ? 'disabled' : ''}
                    class="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    Siguiente →
                </button>
                <button 
                    onclick="${onPageChange}(${totalPages})" 
                    ${currentPage >= totalPages ? 'disabled' : ''}
                    class="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">
                    Final ⇥
                </button>
            </div>
        </div>
        
        <div class="text-center mt-3 text-sm text-gray-400">
            Página ${currentPage} de ${totalPages} 
            <span class="mx-2">•</span>
            <button onclick="scrollToTop()" class="text-blue-400 hover:text-blue-300 underline">
                ↑ Ir arriba
            </button>
        </div>
    `;
    
    return paginationHTML;
}

function generatePageNumbers(currentPage, totalPages, onPageChange) {
    let pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Ajustar el inicio si estamos cerca del final
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Agregar primera página y puntos suspensivos si es necesario
    if (startPage > 1) {
        pages.push(`<button onclick="${onPageChange}(1)" class="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors">1</button>`);
        if (startPage > 2) {
            pages.push(`<span class="px-3 py-2 text-gray-400">...</span>`);
        }
    }
    
    // Agregar páginas visibles
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        pages.push(`
            <button 
                onclick="${onPageChange}(${i})" 
                class="px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}">
                ${i}
            </button>
        `);
    }
    
    // Agregar puntos suspensivos y última página si es necesario
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pages.push(`<span class="px-3 py-2 text-gray-400">...</span>`);
        }
        pages.push(`<button onclick="${onPageChange}(${totalPages})" class="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors">${totalPages}</button>`);
    }
    
    return pages.join('');
}

function paginateArray(array, page, itemsPerPage) {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return array.slice(startIndex, endIndex);
}

function calculateTotalPages(totalItems, itemsPerPage) {
    return Math.ceil(totalItems / itemsPerPage);
}

// AJAX helper function
function makeAJAXRequest(url, callback, errorCallback) {
    const xhr = new XMLHttpRequest();
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            hideLoading();
            if (xhr.status === 200) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    callback(data);
                } catch (e) {
                    errorCallback('Error al procesar la respuesta de la API');
                }
            } else {
                errorCallback(`Error ${xhr.status}: ${xhr.statusText}`);
            }
        }
    };
    
    xhr.onerror = function() {
        hideLoading();
        errorCallback('Error de conexión con la API');
    };
    
    showLoading();
    xhr.open('GET', url, true);
    xhr.send();
}

// APOD - Astronomy Picture of the Day
function loadAPOD() {
    const date = document.getElementById('apod-date').value;
    const url = `${NASA_APIS.APOD}?api_key=${NASA_API_KEY}&date=${date}`;
    
    // Ocultar botón de reintento y mensaje de conexión
    document.getElementById('retry-apod').classList.add('hidden');
    document.getElementById('apod-connection-info').classList.add('hidden');
    
    // Mostrar estado de carga inicial
    showAPODLoading();
    
    // Usar la función con timeout mejorado (20 segundos para APOD)
    makeAJAXRequestWithTimeout(url, function(data) {
        displayAPOD(data);
    }, function(error) {
        hideAPODLoading();
        showErrorWithDiagnosis(`Error al cargar APOD: ${error}`);
        // Mostrar botón de reintento y consejos de conexión
        document.getElementById('retry-apod').classList.remove('hidden');
        document.getElementById('apod-connection-info').classList.remove('hidden');
    }, 20000); // 20 segundos de timeout para imágenes grandes
}

function showAPODLoading() {
    const content = document.getElementById('apod-content');
    content.innerHTML = `
        <div class="apod-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="order-2 lg:order-1">
                <div class="apod-loading-container min-h-96 bg-gray-800 rounded-lg">
                    <div class="text-center p-8">
                        <div class="apod-loading-spinner w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
                        <h3 class="text-xl font-semibold text-gray-200 mb-2">Consultando NASA...</h3>
                        <p class="text-gray-400 mb-4">Obteniendo la imagen astronómica del día</p>
                        <div class="w-64 bg-gray-700 rounded-full h-2 mx-auto">
                            <div class="progress-bar bg-blue-500 h-2 rounded-full"></div>
                        </div>
                        <p class="text-gray-500 text-sm mt-4">Esto puede tomar unos momentos...</p>
                    </div>
                </div>
            </div>
            <div class="order-1 lg:order-2">
                <div class="bg-gray-800 rounded-lg p-6 shimmer min-h-96">
                    <div class="space-y-4">
                        <div class="h-8 bg-gray-700 rounded-lg shimmer"></div>
                        <div class="space-y-2">
                            <div class="h-4 bg-gray-700 rounded shimmer"></div>
                            <div class="h-4 bg-gray-700 rounded shimmer w-3/4"></div>
                            <div class="h-4 bg-gray-700 rounded shimmer w-1/2"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function hideAPODLoading() {
    // Esta función se llama cuando hay error, el éxito se maneja en displayAPOD
    const content = document.getElementById('apod-content');
    if (content.innerHTML.includes('apod-loading-spinner')) {
        content.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-400">No se pudo cargar el contenido de APOD</p>
            </div>
        `;
    }
}

function retryAPOD() {
    console.log('Reintentando cargar APOD...');
    hideError();
    // No es necesario llamar a loadAPOD() aquí porque ya manejamos el estado de carga
    loadAPOD();
}

function displayAPOD(data) {
    const content = document.getElementById('apod-content');
    
    // Función para manejar la carga de imágenes con timeout y fallback
    function createImageElement(imageUrl, title) {
        return `
            <div class="relative min-h-96 bg-gray-800 rounded-lg overflow-hidden">
                <img id="apod-image" 
                     src="${imageUrl}" 
                     alt="${title}" 
                     class="w-full max-h-96 object-cover rounded-lg opacity-0 transition-opacity duration-500"
                     onload="this.style.opacity='1'; document.getElementById('apod-loading').style.display='none';"
                     onerror="handleAPODImageError(this, '${imageUrl}')">
                
                <!-- Indicador de carga para la imagen -->
                <div id="apod-loading" class="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-lg min-h-96">
                    <div class="text-center">
                        <div class="loading-spinner w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p class="text-gray-300 text-base font-medium">Cargando imagen astronómica...</p>
                        <p class="text-gray-400 text-sm mt-2">Esto puede tomar unos momentos</p>
                        <div class="mt-4 w-48 bg-gray-700 rounded-full h-2 mx-auto">
                            <div class="bg-blue-500 h-2 rounded-full animate-pulse" style="width: 60%"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Botón para ver imagen original si hay problemas -->
                <div id="apod-fallback" class="hidden absolute inset-0 flex items-center justify-center bg-gray-800 rounded-lg min-h-96">
                    <div class="text-center p-6">
                        <div class="text-6xl mb-4">⚠️</div>
                        <p class="text-gray-300 mb-4 text-lg">No se pudo cargar la imagen</p>
                        <p class="text-gray-400 mb-6 text-sm">La imagen puede ser muy grande o hay problemas de conectividad</p>
                        <a href="${imageUrl}" target="_blank" 
                           class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors inline-block">
                            🔗 Ver imagen original
                        </a>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Función para manejar videos con mejor control de errores
    function createVideoElement(videoUrl, title) {
        return `
            <div class="relative min-h-96 bg-gray-900 rounded-lg overflow-hidden">
                <!-- Indicador de carga para video -->
                <div id="video-loading" class="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg min-h-96">
                    <div class="text-center">
                        <div class="loading-spinner w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p class="text-gray-300 text-base font-medium">Cargando video...</p>
                        <p class="text-gray-400 text-sm mt-2">Preparando reproductor</p>
                    </div>
                </div>
                
                <iframe src="${videoUrl}" 
                        class="w-full h-96 rounded-lg relative z-10" 
                        frameborder="0" 
                        allowfullscreen
                        onload="document.getElementById('video-loading').style.display='none'"
                        onerror="handleAPODVideoError(this, '${videoUrl}')">
                </iframe>
                
                <div id="video-fallback" class="hidden absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg min-h-96">
                    <div class="text-center p-6">
                        <div class="text-6xl mb-4">🎥</div>
                        <p class="text-gray-300 mb-4 text-lg">No se pudo cargar el video</p>
                        <p class="text-gray-400 mb-6 text-sm">El reproductor puede estar bloqueado o hay problemas de conectividad</p>
                        <a href="${videoUrl}" target="_blank" 
                           class="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors inline-block">
                            🎬 Ver video original
                        </a>
                    </div>
                </div>
            </div>
        `;
    }
    
    const mediaElement = data.media_type === 'video' 
        ? createVideoElement(data.url, data.title)
        : createImageElement(data.url, data.title);
    
    content.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="order-2 lg:order-1">
                ${mediaElement}
            </div>
            <div class="order-1 lg:order-2">
                <h3 class="text-2xl font-bold mb-4 text-blue-300">${data.title}</h3>
                <div class="bg-gray-700 rounded-lg p-4 mb-4">
                    <h4 class="text-lg font-semibold mb-2 text-gray-200">📖 Descripción</h4>
                    <p class="text-gray-300 leading-relaxed">${data.explanation}</p>
                </div>
                <div class="bg-gray-700 rounded-lg p-4">
                    <h4 class="text-lg font-semibold mb-3 text-gray-200">ℹ️ Información</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Fecha:</span>
                            <span class="text-white font-medium">${data.date}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Tipo de media:</span>
                            <span class="text-white font-medium">${data.media_type === 'video' ? '🎥 Video' : '🖼️ Imagen'}</span>
                        </div>
                        ${data.copyright ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Copyright:</span>
                            <span class="text-white font-medium">${data.copyright}</span>
                        </div>` : ''}
                        <div class="pt-3 border-t border-gray-600">
                            <a href="${data.url}" target="_blank" 
                               class="text-blue-400 hover:text-blue-300 flex items-center justify-center bg-gray-600 hover:bg-gray-500 py-2 px-4 rounded-lg transition-colors">
                                🔗 Ver ${data.media_type === 'video' ? 'video' : 'imagen'} original
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Configurar timeout para la imagen (15 segundos)
    if (data.media_type === 'image') {
        setTimeout(() => {
            const img = document.getElementById('apod-image');
            const loading = document.getElementById('apod-loading');
            if (img && loading && loading.style.display !== 'none') {
                handleAPODImageError(img, data.url);
            }
        }, 15000);
    }
    
    // Configurar timeout para video (10 segundos)
    if (data.media_type === 'video') {
        setTimeout(() => {
            const loading = document.getElementById('video-loading');
            if (loading && loading.style.display !== 'none') {
                loading.style.display = 'none';
            }
        }, 10000);
    }
}

// Asteroids Near Earth Object Web Service
function loadAsteroids() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!startDate || !endDate) {
        showError('Por favor selecciona las fechas de inicio y fin');
        return;
    }
    
    const url = `${NASA_APIS.ASTEROIDS}?start_date=${startDate}&end_date=${endDate}&api_key=${NASA_API_KEY}`;
    
    makeAJAXRequest(url, function(data) {
        displayAsteroids(data);
    }, function(error) {
        showError(`Error al cargar asteroides: ${error}`);
    });
}

function displayAsteroids(data) {
    const content = document.getElementById('asteroids-content');
    const asteroids = [];
    
    // Recopilar todos los asteroides de todas las fechas
    Object.keys(data.near_earth_objects).forEach(date => {
        data.near_earth_objects[date].forEach(asteroid => {
            asteroids.push({...asteroid, date});
        });
    });
    
    if (asteroids.length === 0) {
        content.innerHTML = '<p class="text-gray-400">No se encontraron asteroides en el rango de fechas seleccionado.</p>';
        return;
    }
    
    // Guardar todos los asteroides para paginación
    paginationState.asteroids.allAsteroids = asteroids;
    paginationState.asteroids.totalItems = asteroids.length;
    paginationState.asteroids.currentPage = 1;
    
    // Mostrar la primera página
    displayAsteroidsPage(1);
}

function displayAsteroidsPage(page) {
    const content = document.getElementById('asteroids-content');
    const { allAsteroids, itemsPerPage } = paginationState.asteroids;
    
    if (allAsteroids.length === 0) return;
    
    paginationState.asteroids.currentPage = page;
    const totalPages = calculateTotalPages(allAsteroids.length, itemsPerPage);
    
    // Obtener asteroides para la página actual
    const asteroidsToShow = paginateArray(allAsteroids, page, itemsPerPage);
    
    const asteroidsHTML = asteroidsToShow.map(asteroid => {
        const hazardous = asteroid.is_potentially_hazardous_asteroid;
        const diameter = asteroid.estimated_diameter.meters;
        const closeApproach = asteroid.close_approach_data[0];
        
        return `
            <div class="bg-gray-700 rounded-lg p-4 ${hazardous ? 'border-l-4 border-red-500' : ''} fade-in hover:bg-gray-600 transition-all duration-300">
                <div class="flex justify-between items-start mb-3">
                    <h4 class="text-lg font-semibold">${asteroid.name}</h4>
                    ${hazardous ? '<span class="bg-red-600 text-white px-2 py-1 rounded text-xs animate-pulse">POTENCIALMENTE PELIGROSO</span>' : '<span class="bg-green-600 text-white px-2 py-1 rounded text-xs">SEGURO</span>'}
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <p><strong>Fecha:</strong> ${asteroid.date}</p>
                        <p><strong>Velocidad:</strong> ${parseFloat(closeApproach.relative_velocity.kilometers_per_hour).toLocaleString()} km/h</p>
                    </div>
                    <div>
                        <p><strong>Distancia:</strong> ${parseFloat(closeApproach.miss_distance.kilometers).toLocaleString()} km</p>
                        <p><strong>Diámetro:</strong> ${diameter.estimated_diameter_min.toFixed(0)}-${diameter.estimated_diameter_max.toFixed(0)} m</p>
                    </div>
                    <div>
                        <p><strong>Magnitud:</strong> ${asteroid.absolute_magnitude_h}</p>
                        <a href="${asteroid.nasa_jpl_url}" target="_blank" class="text-blue-400 hover:text-blue-300">Ver en JPL</a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    const paginationControls = totalPages > 1 ? 
        createPaginationControls('asteroids', page, totalPages, 'displayAsteroidsPage') : '';
    
    const statsHTML = showDataStats('asteroids', allAsteroids);
    
    content.innerHTML = `
        <div class="mb-4">
            <h3 class="text-xl font-bold">Asteroides encontrados: ${allAsteroids.length}</h3>
            <p class="text-gray-400">
                Objetos cercanos a la Tierra del ${document.getElementById('start-date').value} al ${document.getElementById('end-date').value}
                <br>Mostrando ${asteroidsToShow.length} de ${allAsteroids.length} asteroides
            </p>
        </div>
        ${statsHTML}
        <div class="space-y-4 page-content">
            ${asteroidsHTML}
        </div>
        ${paginationControls}
    `;
}

// Mars Rover Photos
function loadMarsPhotos() {
    const rover = document.getElementById('rover-select').value;
    const sol = document.getElementById('sol-input').value;
    const camera = document.getElementById('camera-select').value;
    
    let url = `${NASA_APIS.MARS_ROVER}/${rover}/photos?sol=${sol}&api_key=${NASA_API_KEY}`;
    if (camera) {
        url += `&camera=${camera}`;
    }
    
    makeAJAXRequest(url, function(data) {
        displayMarsPhotos(data);
    }, function(error) {
        showError(`Error al cargar fotos de Marte: ${error}`);
    });
}

function displayMarsPhotos(data) {
    const content = document.getElementById('mars-content');
    const photos = data.photos;
    
    if (photos.length === 0) {
        content.innerHTML = '<p class="text-gray-400">No se encontraron fotos para los parámetros seleccionados.</p>';
        return;
    }
    
    // Guardar todas las fotos para paginación
    paginationState.mars.allPhotos = photos;
    paginationState.mars.totalItems = photos.length;
    paginationState.mars.currentPage = 1;
    
    // Mostrar la primera página
    displayMarsPhotosPage(1);
}

function displayMarsPhotosPage(page) {
    const content = document.getElementById('mars-content');
    const { allPhotos, itemsPerPage } = paginationState.mars;
    
    if (allPhotos.length === 0) return;
    
    paginationState.mars.currentPage = page;
    const totalPages = calculateTotalPages(allPhotos.length, itemsPerPage);
    
    // Obtener fotos para la página actual
    const photosToShow = paginateArray(allPhotos, page, itemsPerPage);
    
    const photosHTML = photosToShow.map(photo => `
        <div class="bg-gray-700 rounded-lg overflow-hidden fade-in hover:transform hover:scale-105 transition-all duration-300 cursor-pointer"
             onclick="openFullscreen('${photo.img_src}', '${photo.camera.full_name} - Sol ${photo.sol}')">
            <img src="${photo.img_src}" alt="Mars Rover Photo" class="w-full h-48 object-cover" loading="lazy">
            <div class="p-4">
                <p class="text-sm text-gray-300">
                    <strong>Cámara:</strong> ${photo.camera.full_name}<br>
                    <strong>Sol:</strong> ${photo.sol}<br>
                    <strong>Fecha:</strong> ${photo.earth_date}
                </p>
                <div class="flex justify-between items-center mt-2">
                    <a href="${photo.img_src}" target="_blank" 
                       class="text-blue-400 hover:text-blue-300 text-sm"
                       onclick="event.stopPropagation()">
                        Ver original
                    </a>
                    <span class="text-xs text-gray-400">Clic para ampliar</span>
                </div>
            </div>
        </div>
    `).join('');
    
    const paginationControls = totalPages > 1 ? 
        createPaginationControls('mars', page, totalPages, 'displayMarsPhotosPage') : '';
    
    content.innerHTML = `
        <div class="mb-4">
            <h3 class="text-xl font-bold">Fotos del rover ${document.getElementById('rover-select').value.toUpperCase()}</h3>
            <p class="text-gray-400">
                Mostrando ${photosToShow.length} de ${allPhotos.length} fotos del Sol ${document.getElementById('sol-input').value}
                ${totalPages > 1 ? ` (Página ${page} de ${totalPages})` : ''}
                <br><span class="text-sm">💡 Haz clic en cualquier imagen para verla en pantalla completa</span>
            </p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 page-content">
            ${photosHTML}
        </div>
        ${paginationControls}
    `;
}

// EPIC (Earth Polychromatic Imaging Camera) API
function loadEPICImages() {
    const date = document.getElementById('earth-date').value;
    
    if (!date) {
        showError('Por favor selecciona una fecha');
        return;
    }
    
    // Formatear la fecha para la API EPIC (YYYY-MM-DD)
    const formattedDate = date;
    
    // Intentar primero con el servidor oficial de EPIC
    const url = `${NASA_APIS.EPIC}/natural/date/${formattedDate}`;
    
    makeAJAXRequest(url, function(data) {
        if (data.length === 0) {
            showError('No hay imágenes EPIC disponibles para esta fecha. La cámara EPIC comenzó a operar en 2015.');
            return;
        }
        displayEPICImages(data, formattedDate);
    }, function(error) {
        // Si falla, intentar con el mirror de api.nasa.gov
        console.warn('Falló el servidor principal EPIC, intentando con mirror...', error);
        const fallbackUrl = `https://api.nasa.gov/EPIC/api/natural/date/${formattedDate}?api_key=${NASA_API_KEY}`;
        
        makeAJAXRequest(fallbackUrl, function(data) {
            if (data.length === 0) {
                showError('No hay imágenes EPIC disponibles para esta fecha. La cámara EPIC comenzó a operar en 2015.');
                return;
            }
            displayEPICImages(data, formattedDate, true); // true indica que usa el mirror
        }, function(secondError) {
            if (error.includes('404') || secondError.includes('404')) {
                showError('No hay imágenes EPIC disponibles para esta fecha. Intenta con una fecha entre 2015 y hoy.');
            } else {
                showError(`Error al cargar imágenes EPIC. Verifica tu conexión a internet.\n\nDetalles técnicos: ${error}`);
            }
        });
    });
}

function displayEPICImages(images, date, usingMirror = false) {
    const content = document.getElementById('earth-content');
    
    // Mostrar las primeras 6 imágenes para no sobrecargar
    const imagesToShow = images.slice(0, 6);
    
    let imagesHTML = imagesToShow.map((image, index) => {
        // Construir la URL de la imagen EPIC según la documentación oficial
        const dateFormatted = date.replace(/-/g, '/');
        // Siempre usar el servidor principal para las imágenes (no requiere API key)
        const imageUrl = `https://epic.gsfc.nasa.gov/archive/natural/${dateFormatted}/png/${image.image}.png`;
        
        // Formatear la fecha y hora
        const imageDate = new Date(image.date);
        const formattedTime = imageDate.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC'
        });
        
        return `
            <div class="bg-gray-700 rounded-lg p-4 text-center">
                <img src="${imageUrl}" 
                     alt="Imagen EPIC ${index + 1}" 
                     class="w-full h-64 object-cover rounded-lg mb-3 hover:scale-105 transition-transform cursor-pointer"
                     onclick="window.open('${imageUrl}', '_blank')">
                <div class="text-sm text-gray-300">
                    <p class="font-semibold text-blue-300 mb-2">Imagen ${index + 1}</p>
                    <p><strong>🕒 Hora UTC:</strong> ${formattedTime}</p>
                    <p><strong>📍 Coordenadas:</strong></p>
                    <p class="text-xs">Lat: ${image.centroid_coordinates.lat.toFixed(2)}°</p>
                    <p class="text-xs">Lon: ${image.centroid_coordinates.lon.toFixed(2)}°</p>
                    ${image.lunar_j2000_position ? `
                    <p class="text-xs mt-2 text-gray-400">
                        <strong>🌙 Posición Lunar:</strong><br>
                        X: ${image.lunar_j2000_position.x.toFixed(0)} km<br>
                        Y: ${image.lunar_j2000_position.y.toFixed(0)} km<br>
                        Z: ${image.lunar_j2000_position.z.toFixed(0)} km
                    </p>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    content.innerHTML = `
        <div class="mb-6">
            <h3 class="text-2xl font-bold mb-4 text-center text-blue-300">
                🌍 Imágenes EPIC de la Tierra - ${date}
            </h3>
            <div class="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
                <h4 class="text-lg font-semibold mb-2 text-blue-200">ℹ️ Acerca de EPIC</h4>
                <p class="text-blue-100 text-sm leading-relaxed">
                    La cámara EPIC (Earth Polychromatic Imaging Camera) a bordo del satélite DSCOVR 
                    captura imágenes únicas de la Tierra completamente iluminada desde el punto Lagrange L1, 
                    a aproximadamente 1.5 millones de kilómetros de distancia. Estas imágenes muestran 
                    la rotación de la Tierra y diversos fenómenos atmosféricos.
                </p>
                <div class="mt-3 text-xs text-blue-200">
                    <strong>📊 Datos mostrados:</strong> ${images.length} imágenes disponibles 
                    | Mostrando las primeras ${imagesToShow.length}
                    ${usingMirror ? ' | 🔄 Usando servidor mirror' : ' | ✅ Servidor principal'}
                </div>
            </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${imagesHTML}
        </div>
        
        ${images.length > 6 ? `
        <div class="mt-6 text-center">
            <p class="text-gray-400 text-sm mb-3">
                Se encontraron ${images.length} imágenes. Mostrando las primeras 6.
            </p>
            <button onclick="showAllEPICImages()" 
                    class="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors">
                Ver todas las imágenes (${images.length})
            </button>
        </div>
        ` : ''}
        
        <div class="mt-8 text-center">
            <p class="text-gray-400 text-sm">
                💡 Haz clic en cualquier imagen para verla en tamaño completo
            </p>
        </div>
    `;
}

// Función auxiliar para mostrar todas las imágenes EPIC
function showAllEPICImages() {
    const date = document.getElementById('earth-date').value;
    const url = `${NASA_APIS.EPIC}/natural/date/${date}`;
    
    makeAJAXRequest(url, function(images) {
        displayAllEPICImages(images, date);
    }, function(error) {
        // Fallback al mirror si falla el servidor principal
        const fallbackUrl = `https://api.nasa.gov/EPIC/api/natural/date/${date}?api_key=${NASA_API_KEY}`;
        makeAJAXRequest(fallbackUrl, function(images) {
            displayAllEPICImages(images, date);
        }, function(secondError) {
            showError(`Error al cargar todas las imágenes EPIC: ${error}`);
        });
    });
}

function displayAllEPICImages(images, date) {
    const content = document.getElementById('earth-content');
    
    let imagesHTML = images.map((image, index) => {
        const dateFormatted = date.replace(/-/g, '/');
        const imageUrl = `https://epic.gsfc.nasa.gov/archive/natural/${dateFormatted}/png/${image.image}.png`;
        
        const imageDate = new Date(image.date);
        const formattedTime = imageDate.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC'
        });
        
        return `
            <div class="bg-gray-700 rounded-lg p-3 text-center">
                <img src="${imageUrl}" 
                     alt="Imagen EPIC ${index + 1}" 
                     class="w-full h-48 object-cover rounded-lg mb-2 hover:scale-105 transition-transform cursor-pointer"
                     onclick="window.open('${imageUrl}', '_blank')">
                <div class="text-xs text-gray-300">
                    <p class="font-semibold text-blue-300 mb-1">#${index + 1} - ${formattedTime} UTC</p>
                    <p>Lat: ${image.centroid_coordinates.lat.toFixed(2)}°</p>
                    <p>Lon: ${image.centroid_coordinates.lon.toFixed(2)}°</p>
                </div>
            </div>
        `;
    }).join('');
    
    content.innerHTML = `
        <div class="mb-6 text-center">
            <h3 class="text-2xl font-bold mb-4 text-blue-300">
                🌍 Todas las Imágenes EPIC - ${date}
            </h3>
            <button onclick="loadEPICImages()" 
                    class="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors mb-4">
                ← Volver a vista resumida
            </button>
            <p class="text-gray-400 text-sm mb-6">
                Mostrando todas las ${images.length} imágenes disponibles para esta fecha
            </p>
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            ${imagesHTML}
        </div>
        
        <div class="mt-6 text-center">
            <p class="text-gray-400 text-sm">
                💡 Haz clic en cualquier imagen para verla en tamaño completo
            </p>
        </div>
    `;
}

// Event listeners para Enter key
document.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        const activeSection = document.querySelector('.content-section:not(.hidden)');
        if (activeSection) {
            const sectionId = activeSection.id;
            switch(sectionId) {
                case 'apod-section':
                    loadAPOD();
                    break;
                case 'asteroids-section':
                    loadAsteroids();
                    break;
                case 'mars-section':
                    loadMarsPhotos();
                    break;
                case 'earth-section':
                    loadEPICImages();
                    break;
            }
        }
    }
});

// Funciones adicionales para mejorar la experiencia del usuario
function showTooltip(element, message) {
    // Verificar que el elemento existe antes de establecer el tooltip
    if (element) {
        element.title = message;
    }
}

// Función para scroll suave hacia arriba
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Función para mostrar estadísticas de los datos
function showDataStats(section, data) {
    if (section === 'asteroids') {
        const hazardous = data.filter(asteroid => asteroid.is_potentially_hazardous_asteroid).length;
        const safe = data.length - hazardous;
        return `
            <div class="bg-gray-600 rounded-lg p-3 mb-4">
                <h4 class="font-semibold mb-2">📊 Estadísticas</h4>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div class="text-green-400">
                        <span class="status-indicator status-safe"></span>
                        Seguros: ${safe}
                    </div>
                    <div class="text-red-400">
                        <span class="status-indicator status-danger"></span>
                        Peligrosos: ${hazardous}
                    </div>
                </div>
            </div>
        `;
    }
    return '';
}

// Función para exportar datos (funcionalidad futura)
function exportData(section, data, format = 'json') {
    // Esta función se puede expandir para exportar datos en diferentes formatos
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `nasa-${section}-data.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Función para el modo de vista completa de imágenes
function openFullscreen(imageSrc, title) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="relative w-full h-full flex flex-col items-center justify-center">
            <button onclick="this.parentElement.parentElement.remove()" 
                    class="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl z-10 shadow-lg">
                ×
            </button>
            <div class="flex flex-col items-center justify-center max-w-full max-h-full">
                <img src="${imageSrc}" 
                     alt="${title}" 
                     class="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl">
                <div class="text-white text-center mt-4 bg-black bg-opacity-70 rounded-lg p-4 max-w-2xl">
                    <h3 class="text-lg font-semibold mb-2">${title}</h3>
                    <p class="text-sm text-gray-300">Haz clic fuera de la imagen o presiona ESC para cerrar</p>
                </div>
            </div>
        </div>
    `;
    
    // Cerrar modal al hacer clic fuera de la imagen
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Cerrar modal con la tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.body.contains(modal)) {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
}

// Funciones de manejo de errores para APOD
function handleAPODImageError(imgElement, originalUrl) {
    console.warn('Error al cargar imagen APOD:', originalUrl);
    
    const loading = document.getElementById('apod-loading');
    const fallback = document.getElementById('apod-fallback');
    
    if (loading) loading.style.display = 'none';
    if (fallback) fallback.classList.remove('hidden');
    
    // Mostrar información adicional de troubleshooting
    document.getElementById('apod-connection-info').classList.remove('hidden');
    document.getElementById('retry-apod').classList.remove('hidden');
    
    // Intentar diferentes estrategias de carga
    attemptImageLoadStrategies(imgElement, originalUrl, fallback);
}

function attemptImageLoadStrategies(imgElement, originalUrl, fallback) {
    const strategies = [
        // Estrategia 1: Intentar con parámetros de cache-busting
        () => {
            const cacheBustUrl = originalUrl + (originalUrl.includes('?') ? '&' : '?') + 'cb=' + Date.now();
            return loadImageWithPromise(cacheBustUrl);
        },
        
        // Estrategia 2: Intentar con thumbnail
        () => {
            const thumbnailUrl = originalUrl.replace(/\.(jpg|jpeg|png)$/i, '_thumb.$1');
            if (thumbnailUrl !== originalUrl) {
                return loadImageWithPromise(thumbnailUrl);
            }
            return Promise.reject('No thumbnail available');
        },
        
        // Estrategia 3: Intentar cargar versión de menor calidad
        () => {
            const lowQualityUrl = originalUrl.replace(/\.(jpg|jpeg|png)$/i, '_small.$1');
            if (lowQualityUrl !== originalUrl) {
                return loadImageWithPromise(lowQualityUrl);
            }
            return Promise.reject('No low quality version available');
        }
    ];
    
    // Intentar estrategias secuencialmente
    let currentStrategy = 0;
    
    function tryNextStrategy() {
        if (currentStrategy >= strategies.length) {
            console.warn('Todas las estrategias de carga fallaron');
            return;
        }
        
        strategies[currentStrategy]()
            .then((newUrl) => {
                imgElement.src = newUrl;
                imgElement.style.opacity = '1';
                if (fallback) fallback.classList.add('hidden');
                
                // Agregar nota sobre la imagen alternativa
                const note = document.createElement('p');
                note.className = 'text-yellow-400 text-xs mt-2';
                note.textContent = '⚠️ Imagen alternativa cargada debido a problemas de conexión';
                imgElement.parentNode.appendChild(note);
            })
            .catch(() => {
                currentStrategy++;
                setTimeout(tryNextStrategy, 2000); // Esperar 2 segundos antes del siguiente intento
            });
    }
    
    tryNextStrategy();
}

function loadImageWithPromise(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => reject('Failed to load image');
        img.src = url;
    });
}

function handleAPODVideoError(iframeElement, originalUrl) {
    console.warn('Error al cargar video APOD:', originalUrl);
    
    const fallback = document.getElementById('video-fallback');
    if (fallback) fallback.classList.remove('hidden');
    
    // Mostrar información adicional
    document.getElementById('apod-connection-info').classList.remove('hidden');
    document.getElementById('retry-apod').classList.remove('hidden');
}

// Función mejorada para el AJAX con timeout personalizado
function makeAJAXRequestWithTimeout(url, callback, errorCallback, timeout = 15000) {
    const xhr = new XMLHttpRequest();
    let isCompleted = false;
    
    // Configurar timeout
    const timeoutId = setTimeout(() => {
        if (!isCompleted) {
            isCompleted = true;
            xhr.abort();
            hideLoading();
            errorCallback('Tiempo de espera agotado. Verifica tu conexión a internet o intenta más tarde.');
        }
    }, timeout);
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && !isCompleted) {
            isCompleted = true;
            clearTimeout(timeoutId);
            hideLoading();
            
            if (xhr.status === 200) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    callback(data);
                } catch (e) {
                    errorCallback('Error al procesar la respuesta de la API');
                }
            } else if (xhr.status === 0) {
                errorCallback('Error de conexión. Verifica tu conexión a internet.');
            } else {
                errorCallback(`Error ${xhr.status}: ${xhr.statusText}`);
            }
        }
    };
    
    xhr.onerror = function() {
        if (!isCompleted) {
            isCompleted = true;
            clearTimeout(timeoutId);
            hideLoading();
            errorCallback('Error de conexión con la API');
        }
    };
    
    showLoading();
    xhr.open('GET', url, true);
    xhr.send();
}

// Función para probar conectividad con la API de la NASA
function testNASAConnectivity() {
    const testUrl = `${NASA_APIS.APOD}?api_key=${NASA_API_KEY}&count=1`;
    
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const timeout = setTimeout(() => {
            xhr.abort();
            reject('Timeout');
        }, 5000);
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                clearTimeout(timeout);
                if (xhr.status === 200) {
                    resolve('Connected');
                } else {
                    reject(`HTTP ${xhr.status}`);
                }
            }
        };
        
        xhr.onerror = function() {
            clearTimeout(timeout);
            reject('Network Error');
        };
        
        xhr.open('GET', testUrl, true);
        xhr.send();
    });
}

// Función mejorada para mostrar errores con diagnóstico
function showErrorWithDiagnosis(message) {
    showError(message);
    
    // Realizar diagnóstico de conectividad
    testNASAConnectivity()
        .then(() => {
            console.log('Conectividad con NASA API: OK');
        })
        .catch((error) => {
            console.warn('Problema de conectividad:', error);
            const additionalInfo = document.createElement('div');
            additionalInfo.className = 'mt-2 p-2 bg-yellow-600 rounded text-sm';
            additionalInfo.innerHTML = `
                <p><strong>Diagnóstico:</strong></p>
                <ul class="list-disc list-inside mt-1">
                    <li>Estado de conexión: ${navigator.onLine ? 'Conectado' : 'Desconectado'}</li>
                    <li>Test NASA API: ${error}</li>
                    <li>Recomendación: ${error === 'Timeout' ? 'Conexión lenta, intenta de nuevo' : 'Verifica tu conexión a internet'}</li>
                </ul>
            `;
            document.getElementById('error-message').appendChild(additionalInfo);
        });
}

// Agregar tooltips informativos
document.addEventListener('DOMContentLoaded', function() {
    const solInput = document.getElementById('sol-input');
    showTooltip(solInput, 'Sol es un día marciano (24 horas, 39 minutos y 35 segundos)');
    
    // Los elementos de latitud y longitud ya no existen en EPIC, así que los removemos
    const earthDate = document.getElementById('earth-date');
    showTooltip(earthDate, 'Selecciona una fecha desde junio 2015 cuando EPIC comenzó a operar');
    
    const asteroidsPerPage = document.getElementById('asteroids-per-page');
    const photosPerPage = document.getElementById('photos-per-page');
    showTooltip(asteroidsPerPage, 'Número de asteroides a mostrar por página');
    showTooltip(photosPerPage, 'Número de fotos a mostrar por página');
    
    const roverSelect = document.getElementById('rover-select');
    showTooltip(roverSelect, 'Selecciona el rover marciano: Curiosity, Opportunity, Spirit, etc.');
    
    const cameraSelect = document.getElementById('camera-select');
    showTooltip(cameraSelect, 'Filtra por cámara específica o deja en blanco para todas las cámaras');
});