// --- 1. CONFIGURACIÓN ---
const API_BASE_URL = 'http://127.0.0.1:5001/api/';
let charts = {};

function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Elemento '${id}' no encontrado`);
    }
    return element;
}

// --- 2. INICIALIZACIÓN DE GRÁFICOS ---

function initCharts() {
    // A. Gráfico de Línea: Evolución de Consumo Energético (TDP)
    const ctxLineaEnergia = getElement('lineaEnergia')?.getContext('2d');
    if (ctxLineaEnergia) {
        charts.lineaEnergia = new Chart(ctxLineaEnergia, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'TDP CPU (W)',
                        data: [],
                        borderColor: 'rgba(220, 53, 69, 1)',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 2
                    },
                    {
                        label: 'TDP RAM (W)',
                        data: [],
                        borderColor: 'rgba(255, 193, 7, 1)',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 2
                    },
                    {
                        label: 'Potencia Total (W)',
                        data: [],
                        borderColor: 'rgba(0, 123, 255, 1)',
                        backgroundColor: 'rgba(0, 123, 255, 0.2)',
                        fill: false,
                        tension: 0.3,
                        pointRadius: 0,
                        borderWidth: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Potencia (W)' }
                    },
                    x: {
                        title: { display: true, text: 'Tiempo' }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + ' W';
                            }
                        }
                    }
                }
            }
        });
    }
    
    // B. Gráfico de Barras: Consumo Actual vs Máximo/Mínimo
    const ctxBarTDP = getElement('barTDP')?.getContext('2d');
    if (ctxBarTDP) {
        charts.barTDP = new Chart(ctxBarTDP, {
            type: 'bar',
            data: {
                labels: ['CPU', 'RAM', 'Total'],
                datasets: [
                    {
                        label: 'Mínimo (W)',
                        data: [0, 0, 0],
                        backgroundColor: 'rgba(40, 167, 69, 0.7)',
                    },
                    {
                        label: 'Actual (W)',
                        data: [0, 0, 0],
                        backgroundColor: 'rgba(0, 123, 255, 0.7)',
                    },
                    {
                        label: 'Máximo (W)',
                        data: [0, 0, 0],
                        backgroundColor: 'rgba(220, 53, 69, 0.7)',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Potencia (W)' }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }

    // C. Gauge de Potencia Total
    const ctxGaugePotencia = getElement('gaugePotencia')?.getContext('2d');
    if (ctxGaugePotencia) {
        charts.gaugePotencia = new Chart(ctxGaugePotencia, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [0, 100],
                    backgroundColor: ['#007bff', '#e0e0e0'],
                    circumference: 180,
                    rotation: 270,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    }

    // D. Gauge de CPU
    const ctxGaugeCPU = getElement('gaugeCPU')?.getContext('2d');
    if (ctxGaugeCPU) {
        charts.gaugeCPU = new Chart(ctxGaugeCPU, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [0, 100],
                    backgroundColor: ['#28a745', '#e0e0e0'],
                    circumference: 180,
                    rotation: 270,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    }

    // E. Gauge de RAM
    const ctxGaugeRAM = getElement('gaugeRAM')?.getContext('2d');
    if (ctxGaugeRAM) {
        charts.gaugeRAM = new Chart(ctxGaugeRAM, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [0, 100],
                    backgroundColor: ['#ffc107', '#e0e0e0'],
                    circumference: 180,
                    rotation: 270,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    }

    // F. Gráfico de Línea: Uso de CPU y RAM
    const ctxLineaUso = getElement('lineaUso')?.getContext('2d');
    if (ctxLineaUso) {
        charts.lineaUso = new Chart(ctxLineaUso, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'CPU (%)',
                        data: [],
                        borderColor: 'rgba(220, 53, 69, 1)',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 1
                    },
                    {
                        label: 'RAM (%)',
                        data: [],
                        borderColor: 'rgba(255, 193, 7, 1)',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: { display: true, text: 'Uso (%)' }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }

    // G. Gráfico de Torta: Distribución de Consumo
    const ctxTortaTDP = getElement('tortaTDP')?.getContext('2d');
    if (ctxTortaTDP) {
        charts.tortaTDP = new Chart(ctxTortaTDP, {
            type: 'doughnut',
            data: {
                labels: ['TDP CPU', 'TDP RAM'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#dc3545', '#ffc107'],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.parsed.toFixed(2) + ' W';
                            }
                        }
                    }
                }
            }
        });
    }
}

// --- 3. ACTUALIZACIÓN DE DATOS ---

async function fetchAndRenderData() {
    console.log('🔄 Actualizando...', new Date().toLocaleTimeString());
    
    try {
        // Obtener datos de tendencia
        const responseTendencia = await fetch(API_BASE_URL + 'tendencia');
        if (!responseTendencia.ok) throw new Error('Error en tendencia');
        const dataTendencia = await responseTendencia.json();

        if (dataTendencia && dataTendencia.length > 0) {
            const labels = dataTendencia.map(d => d.ts);
            const cpuData = dataTendencia.map(d => d.cpu);
            const ramData = dataTendencia.map(d => d.ram);
            const tdpCpuData = dataTendencia.map(d => d.tdp_cpu);
            const tdpRamData = dataTendencia.map(d => d.tdp_ram);
            const potenciaTotalData = dataTendencia.map(d => d.potencia_total);

            // Actualizar gráfico de energía
            if (charts.lineaEnergia) {
                charts.lineaEnergia.data.labels = labels;
                charts.lineaEnergia.data.datasets[0].data = tdpCpuData;
                charts.lineaEnergia.data.datasets[1].data = tdpRamData;
                charts.lineaEnergia.data.datasets[2].data = potenciaTotalData;
                charts.lineaEnergia.update('none');
            }

            // Actualizar gráfico de uso
            if (charts.lineaUso) {
                charts.lineaUso.data.labels = labels;
                charts.lineaUso.data.datasets[0].data = cpuData;
                charts.lineaUso.data.datasets[1].data = ramData;
                charts.lineaUso.update('none');
            }
        }

        // Obtener datos actuales
        const responseActual = await fetch(API_BASE_URL + 'actual');
        if (!responseActual.ok) throw new Error('Error en actual');
        const dataActual = await responseActual.json();

        if (dataActual && !dataActual.error) {
            const cpuActual = dataActual.cpu_actual || 0;
            const ramActual = dataActual.ram_actual || 0;
            const tdpCpu = dataActual.tdp_cpu || 0;
            const tdpRam = dataActual.tdp_ram || 0;
            const potenciaTotal = dataActual.potencia_total || 0;
            const energiaAcumulada = dataActual.energia_acumulada || 0;
            const stats = dataActual.stats || {};

            // Actualizar Gauge de CPU
            if (charts.gaugeCPU) {
                const color = cpuActual < 30 ? '#28a745' : cpuActual < 80 ? '#ffc107' : '#dc3545';
                charts.gaugeCPU.data.datasets[0].data = [cpuActual, 100 - cpuActual];
                charts.gaugeCPU.data.datasets[0].backgroundColor = [color, '#e0e0e0'];
                charts.gaugeCPU.update('none');
            }
            const cpuText = getElement('cpuActualText');
            if (cpuText) cpuText.innerText = `CPU: ${cpuActual.toFixed(1)}% | ${tdpCpu.toFixed(1)}W`;

            // Actualizar Gauge de RAM
            if (charts.gaugeRAM) {
                const color = ramActual < 40 ? '#28a745' : ramActual < 80 ? '#ffc107' : '#dc3545';
                charts.gaugeRAM.data.datasets[0].data = [ramActual, 100 - ramActual];
                charts.gaugeRAM.data.datasets[0].backgroundColor = [color, '#e0e0e0'];
                charts.gaugeRAM.update('none');
            }
            const ramText = getElement('ramActualText');
            if (ramText) ramText.innerText = `RAM: ${ramActual.toFixed(1)}% | ${tdpRam.toFixed(1)}W`;

            // Actualizar Gauge de Potencia Total
            if (charts.gaugePotencia) {
                const maxPotencia = 100; // Ajusta según tu TDP máximo
                const percent = Math.min((potenciaTotal / maxPotencia) * 100, 100);
                const color = percent < 40 ? '#28a745' : percent < 70 ? '#ffc107' : '#dc3545';
                charts.gaugePotencia.data.datasets[0].data = [percent, 100 - percent];
                charts.gaugePotencia.data.datasets[0].backgroundColor = [color, '#e0e0e0'];
                charts.gaugePotencia.update('none');
            }
            const potenciaText = getElement('potenciaText');
            if (potenciaText) potenciaText.innerText = `${potenciaTotal.toFixed(2)} W`;

            // Actualizar energía acumulada
            const energiaText = getElement('energiaAcumulada');
            if (energiaText) energiaText.innerText = `${energiaAcumulada.toFixed(3)} Wh`;

            // Actualizar gráfico de barras TDP
            if (charts.barTDP) {
                charts.barTDP.data.datasets[0].data = [
                    stats.cpu_min || 0,
                    stats.ram_min || 0,
                    stats.potencia_min || 0
                ];
                charts.barTDP.data.datasets[1].data = [tdpCpu, tdpRam, potenciaTotal];
                charts.barTDP.data.datasets[2].data = [
                    stats.cpu_max || 0,
                    stats.ram_max || 0,
                    stats.potencia_max || 0
                ];
                charts.barTDP.update('none');
            }

            // Actualizar torta de distribución TDP
            if (charts.tortaTDP) {
                charts.tortaTDP.data.datasets[0].data = [tdpCpu, tdpRam];
                charts.tortaTDP.update('none');
            }

            // Actualizar temperatura
            const tempText = getElement('tempActual');
            if (tempText) tempText.innerText = `${dataActual.temp_actual.toFixed(1)}°C`;

            console.log('✅ Actualizado');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// --- 4. INICIO ---
window.onload = function() {
    console.log('🚀 Iniciando Dashboard Energético...');
    initCharts(); 
    fetchAndRenderData(); 
    setInterval(fetchAndRenderData, 3000); 
    console.log('⏰ Actualización cada 3 segundos');
};