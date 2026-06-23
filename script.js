/* ==========================================================================
   INTERATIVIDADE E GERENCIAMENTO DE ESTADOS - SISTEMA CARTOMANTE
   JavaScript Vanilla Moderno
   ========================================================================== */

// Estados do Sistema
let state = {
    themeChoice: 'auto', // 'auto' | 'morning' | 'afternoon' | 'sunset' | 'night' | 'light' | 'medium' | 'dark'
    lightingMode: 'dark', // 'light' | 'medium' | 'dark'
    timeMode: 'auto',     // 'auto' | 'manual'
    currentPeriod: 'night', // 'morning' | 'afternoon' | 'sunset' | 'night'
    accessibility: {
        highContrast: false,
        largeFont: false,
        reduceMotion: false,
        anxietyMode: false
    }
};

// Mapeamento de Títulos das Janelas do Mockup
const mockupTitles = {
    dashboard: 'Sistema Cartomante - Dashboard Visão Geral',
    agenda: 'Sistema Cartomante - Agenda de Atendimentos',
    pergunta: 'Sistema Cartomante - Canal de Perguntas ao Baralho',
    financeiro: 'Sistema Cartomante - Fluxo Financeiro Lunar'
};

// Conselhos Espirituais do Baralho (Tiragens rápidas)
const conselhosEspirituais = [
    {
        carta: "A SACERDOTISA",
        tema: "Intuição • Mistério",
        texto: `"Silencie as vozes externas hoje. As respostas que você busca residem nas águas profundas do seu próprio templo interno. Confie no invisível e nos seus pressentimentos."`
    },
    {
        carta: "A IMPERATRIZ",
        tema: "Abundância • Criação",
        texto: `"O momento é de fertilidade e florescimento. Acolha suas ideias com carinho, nutra seu corpo e permita-se receber a generosidade do universo com elegância."`
    },
    {
        carta: "O EREMITA",
        tema: "Sabedoria • Introspeção",
        texto: `"Acenda sua própria lanterna e recolha-se por um instante. A pressa do mundo não deve ditar o seu ritmo. Na solitude e no silêncio, a verdade se revela cristalina."`
    },
    {
        carta: "A ESTRELA",
        tema: "Esperança • Inspiração",
        texto: `"Você está sob proteção celeste direta. Lave as mágoas do passado e confie na renovação dos seus caminhos. Sua luz natural é um farol de cura para muitos."`
    }
];

// Inicialização da Página
document.addEventListener('DOMContentLoaded', () => {
    // 1. Gerar estrelas para o céu noturno
    generateStars();
    
    // 2. Inicializar sistema de horário automático ou manual
    initTimeSystem();
    
    // 3. Atualizar layout inicial com base no estado
    applyStateToDOM();
    
    // 4. Executar cálculo de preços do tarô inicial
    calculateTarotPrice();
    
    // 5. Inicializar o menu mobile responsivo
    initResponsiveMobileMenu();
    
    // 6. Criar widget flutuante de tema
    createThemeWidget();
    
    // 7. Inicializar notificações globais
    initGlobalNotifications();
    
    // 7. Iniciar timer para atualizar o horário em tempo real (se automático estiver ativo)
    setInterval(() => {
        if (state.timeMode === 'auto') {
            updateAutomaticTime();
        }
    }, 60000); // Atualiza a cada minuto
});

/* ==========================================================================
   1. SISTEMA DE PARTÍCULAS INTERATIVAS (MAGNÉTICO + CONSTELAÇÕES)
   Inspirado no Antigravity IDE — partículas seguem o cursor com gravidade suave
   ========================================================================== */
let starCanvasAnimFrame = null;
let particleMode = null; // 'stars' | 'flakes'

function generateStars() {
    const container = document.getElementById('stars-container');
    if (!container) return;

    // Cancelar animação anterior
    if (starCanvasAnimFrame) {
        cancelAnimationFrame(starCanvasAnimFrame);
        starCanvasAnimFrame = null;
    }

    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'interactive-stars-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        rebuildParticles();
    });

    let particles = [];
    let sparkles = [];
    let mouse = { x: null, y: null, active: false };
    let isDark = document.body.classList.contains('mode-dark');
    let isMedium = document.body.classList.contains('mode-medium');
    let isLight = document.body.classList.contains('mode-light');
    const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const CONNECTION_DIST = isMobile ? 80 : 120;
    const MOUSE_RADIUS = isMobile ? 100 : 180;

    function getMode() {
        isDark = document.body.classList.contains('mode-dark');
        isMedium = document.body.classList.contains('mode-medium');
        isLight = document.body.classList.contains('mode-light');
    }

    function rebuildParticles() {
        getMode();
        particles = [];

        // Quantidade adaptada ao tamanho da tela e performance
        const area = width * height;
        const density = isMobile ? 0.00006 : 0.0001;
        let count = Math.min(Math.floor(area * density), isMobile ? 120 : 220);

        if (isLight) {
            // Modo claro: flocos dourados mais sutis
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    baseX: Math.random() * width,
                    baseY: Math.random() * height,
                    size: Math.random() * 2.0 + 0.5,
                    speedX: (Math.random() - 0.5) * 0.15,
                    speedY: (Math.random() - 0.5) * 0.15,
                    twinklePhase: Math.random() * Math.PI * 2,
                    twinkleSpeed: 0.01 + Math.random() * 0.02,
                    gold: true,
                    hue: [199, 180, 160, 210, 220][Math.floor(Math.random() * 5)]
                });
            }
        } else {
            // Modo escuro e médio: estrelas brancas/douradas
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    baseX: Math.random() * width,
                    baseY: Math.random() * height,
                    size: Math.random() * 2.2 + 0.4,
                    speedX: (Math.random() - 0.5) * 0.1,
                    speedY: (Math.random() - 0.5) * 0.1,
                    twinklePhase: Math.random() * Math.PI * 2,
                    twinkleSpeed: 0.008 + Math.random() * 0.025,
                    gold: Math.random() < 0.15
                });
            }
        }
    }

    rebuildParticles();

    // Recriar ao mudar de tema
    const themeObserver = new MutationObserver(() => {
        const wasDark = isDark;
        const wasMedium = isMedium;
        const wasLight = isLight;
        getMode();
        if (wasDark !== isDark || wasMedium !== isMedium || wasLight !== isLight) {
            rebuildParticles();
        }
    });
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    // Mouse tracking
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;

        // Poeira estelar no trajeto do cursor
        if (state.accessibility && !state.accessibility.reduceMotion && Math.random() < 0.3) {
            sparkles.push({
                x: mouse.x + (Math.random() - 0.5) * 8,
                y: mouse.y + (Math.random() - 0.5) * 8,
                size: Math.random() * 2.0 + 0.6,
                speedX: (Math.random() - 0.5) * 1.5,
                speedY: (Math.random() - 0.5) * 1.5,
                alpha: 0.9,
                decay: 0.02 + Math.random() * 0.02,
                gold: Math.random() < 0.6
            });
        }
    });

    window.addEventListener('mouseleave', () => { mouse.active = false; });

    // Touch support — toque dispersa partículas
    if (isMobile) {
        let touchTimer = null;
        window.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                mouse.x = e.touches[0].clientX;
                mouse.y = e.touches[0].clientY;
                mouse.active = true;
            }
        });
        window.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                mouse.x = e.touches[0].clientX;
                mouse.y = e.touches[0].clientY;
                mouse.active = true;
            }
        });
        window.addEventListener('touchend', () => {
            // Manter ativo por 1s após toque para efeito de dispersão suave
            clearTimeout(touchTimer);
            touchTimer = setTimeout(() => { mouse.active = false; }, 1000);
        });
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        getMode();

        const globalOpacity = isLight ? 0.45 : (isMedium ? 0.75 : 1.0);

        // === MOVER E DESENHAR PARTÍCULAS ===
        particles.forEach(p => {
            // Movimento base
            p.x += p.speedX;
            p.y += p.speedY;

            // Atração gravitacional ao mouse
            if (mouse.active && mouse.x !== null) {
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < MOUSE_RADIUS) {
                    const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
                    const attractForce = force * 0.6;
                    // Atração + leve órbita
                    p.x += (dx / dist) * attractForce + (-dy / dist) * force * 0.15;
                    p.y += (dy / dist) * attractForce + (dx / dist) * force * 0.15;
                }
            } else if (!isMobile) {
                // Retorno suave à posição base quando mouse não ativo
                p.x += (p.baseX - p.x) * 0.003;
                p.y += (p.baseY - p.y) * 0.003;
            }

            // Wrap around
            if (p.x < -20) p.x = width + 20;
            if (p.x > width + 20) p.x = -20;
            if (p.y < -20) p.y = height + 20;
            if (p.y > height + 20) p.y = -20;

            // Twinkle
            p.twinklePhase += p.twinkleSpeed;
            const twinkle = Math.sin(p.twinklePhase) * 0.35 + 0.6;
            const opacity = twinkle * globalOpacity;

            if (isLight) {
                // Flocos dourados sutis
                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
                gradient.addColorStop(0, `rgba(${p.hue}, 162, 122, ${opacity * 0.7})`);
                gradient.addColorStop(0.5, `rgba(${p.hue}, 162, 122, ${opacity * 0.3})`);
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
                ctx.fill();
                // Ponto central
                ctx.fillStyle = `rgba(255, 248, 220, ${opacity * 0.8})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Estrelas (escuro/médio)
                if (p.gold) {
                    ctx.fillStyle = `rgba(199, 162, 122, ${opacity})`;
                } else {
                    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                }
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

                // Cruz brilhante nas maiores
                if (p.size > 1.6 && twinkle > 0.75) {
                    const crossColor = p.gold
                        ? `rgba(199, 162, 122, ${opacity * 0.4})`
                        : `rgba(255, 255, 255, ${opacity * 0.3})`;
                    ctx.strokeStyle = crossColor;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(p.x - p.size * 3, p.y);
                    ctx.lineTo(p.x + p.size * 3, p.y);
                    ctx.moveTo(p.x, p.y - p.size * 3);
                    ctx.lineTo(p.x, p.y + p.size * 3);
                    ctx.stroke();
                }
            }
        });

        // === LINHAS DE CONSTELAÇÃO entre partículas próximas ===
        if (!isLight) {
            const lineOpacity = isMedium ? 0.06 : 0.08;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CONNECTION_DIST) {
                        const alpha = (1 - dist / CONNECTION_DIST) * lineOpacity * globalOpacity;
                        ctx.strokeStyle = `rgba(199, 162, 122, ${alpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        }

        // === POEIRA ESTELAR (sparkles do mouse) ===
        for (let i = sparkles.length - 1; i >= 0; i--) {
            const sp = sparkles[i];
            sp.x += sp.speedX;
            sp.y += sp.speedY;
            sp.alpha -= sp.decay;
            if (sp.alpha <= 0) { sparkles.splice(i, 1); continue; }

            ctx.fillStyle = sp.gold
                ? `rgba(199, 162, 122, ${sp.alpha * globalOpacity})`
                : `rgba(236, 239, 245, ${sp.alpha * globalOpacity})`;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
            ctx.fill();
        }

        starCanvasAnimFrame = requestAnimationFrame(animate);
    }

    animate();
}

/* ==========================================================================
   2. SISTEMA DINÂMICO DE HORÁRIOS & TEMAS
   ========================================================================== */
function initTimeSystem() {
    // Tentar recuperar as preferências de tema e acessibilidade salvas pelo usuário
    const stored = localStorage.getItem('cartomante_app_state');
    if (stored) {
        try {
            state = JSON.parse(stored);
        } catch (e) {
            console.warn("Erro ao decodificar preferências salvas, usando padrão inicial.", e);
        }
    }
    
    applyTheme();
}

function applyTheme() {
    if (!state.themeChoice) {
        state.themeChoice = 'auto';
    }
    
    if (state.themeChoice === 'auto') {
        const now = new Date();
        const hours = now.getHours();
        if (hours >= 6 && hours < 12) {
            state.currentPeriod = 'morning';
            state.lightingMode = 'light';
        } else if (hours >= 12 && hours < 17) {
            state.currentPeriod = 'afternoon';
            state.lightingMode = 'light';
        } else if (hours >= 17 && hours < 20) {
            state.currentPeriod = 'sunset';
            state.lightingMode = 'medium';
        } else {
            state.currentPeriod = 'night';
            state.lightingMode = 'dark';
        }
    } else if (state.themeChoice === 'morning') {
        state.currentPeriod = 'morning';
        if (!['light','medium','dark'].includes(state.lightingMode)) state.lightingMode = 'light';
    } else if (state.themeChoice === 'afternoon') {
        state.currentPeriod = 'afternoon';
        if (!['light','medium','dark'].includes(state.lightingMode)) state.lightingMode = 'light';
    } else if (state.themeChoice === 'sunset') {
        state.currentPeriod = 'sunset';
        if (!['light','medium','dark'].includes(state.lightingMode)) state.lightingMode = 'medium';
    } else if (state.themeChoice === 'night') {
        state.currentPeriod = 'night';
        if (!['light','medium','dark'].includes(state.lightingMode)) state.lightingMode = 'dark';
    } else if (state.themeChoice === 'light') {
        state.lightingMode = 'light';
    } else if (state.themeChoice === 'medium') {
        state.lightingMode = 'medium';
    } else if (state.themeChoice === 'dark') {
        state.lightingMode = 'dark';
    }
    
    applyStateToDOM();
}

function updateAutomaticTime() {
    if (state.themeChoice === 'auto') {
        applyTheme();
    }
}

function setLightingMode(mode) {
    state.themeChoice = mode;
    applyTheme();
}

function setTimeMode(mode) {
    if (mode === 'auto') {
        state.themeChoice = 'auto';
    } else {
        state.themeChoice = state.currentPeriod;
    }
    applyTheme();
}

function handleSliderChange(val) {
    let period = 'night';
    switch (parseInt(val)) {
        case 1: period = 'morning'; break;
        case 2: period = 'afternoon'; break;
        case 3: period = 'sunset'; break;
        case 4: period = 'night'; break;
    }
    state.themeChoice = period;
    applyTheme();
}

function selectPeriod(period) {
    state.themeChoice = period;
    applyTheme();
}

// Aplica as classes e estilos ao DOM com base no estado ativo
function applyStateToDOM() {
    const body = document.body;
    
    // Remover classes antigas de tema de período
    body.classList.remove('theme-morning', 'theme-afternoon', 'theme-sunset', 'theme-night');
    body.classList.remove('mode-light', 'mode-medium', 'mode-dark');
    
    // Adicionar as classes de estado atuais
    body.classList.add(`theme-${state.currentPeriod}`);
    body.classList.add(`mode-${state.lightingMode}`);
    
    // Sincronizar classes de acessibilidade global no body
    body.classList.toggle('accessibility-high-contrast', state.accessibility.highContrast);
    body.classList.toggle('accessibility-large-font', state.accessibility.largeFont);
    body.classList.toggle('accessibility-reduce-motion', state.accessibility.reduceMotion);
    body.classList.toggle('accessibility-anxiety-mode', state.accessibility.anxietyMode);
    
    // Persistir preferências no armazenamento local
    localStorage.setItem('cartomante_app_state', JSON.stringify(state));
    
    // Sincronizar o dropdown se existir
    const themeChoiceSelect = document.getElementById('themeChoiceSelect');
    if (themeChoiceSelect) {
        themeChoiceSelect.value = state.themeChoice || 'auto';
    }
    
    // Sincronizar os cards de atmosfera para realçar o ativo (se existirem na página)
    const cardMorning = document.getElementById('card-morning');
    if (cardMorning) cardMorning.classList.toggle('active', state.currentPeriod === 'morning');
    const cardAfternoon = document.getElementById('card-afternoon');
    if (cardAfternoon) cardAfternoon.classList.toggle('active', state.currentPeriod === 'afternoon');
    const cardSunset = document.getElementById('card-sunset');
    if (cardSunset) cardSunset.classList.toggle('active', state.currentPeriod === 'sunset');
    const cardNight = document.getElementById('card-night');
    if (cardNight) cardNight.classList.toggle('active', state.currentPeriod === 'night');
    
    // Sincronizar os botões do header se existirem
    const btnModeDark = document.getElementById('btn-mode-dark');
    if (btnModeDark) btnModeDark.classList.toggle('active', state.lightingMode === 'dark');
    const btnModeLight = document.getElementById('btn-mode-light');
    if (btnModeLight) btnModeLight.classList.toggle('active', state.lightingMode === 'light');
    
    const btnTimeAuto = document.getElementById('btn-time-auto');
    if (btnTimeAuto) btnTimeAuto.classList.toggle('active', state.themeChoice === 'auto');
    const btnTimeManual = document.getElementById('btn-time-manual');
    if (btnTimeManual) btnTimeManual.classList.toggle('active', state.themeChoice !== 'auto');
    
    // Sincronizar o slider caso esteja no modo manual
    const slider = document.getElementById('time-range-slider');
    if (slider) {
        if (state.themeChoice === 'auto') {
            slider.disabled = true;
            slider.style.opacity = '0.5';
        } else {
            slider.disabled = false;
            slider.style.opacity = '1';
            let sliderVal = 4;
            if (state.currentPeriod === 'morning') sliderVal = 1;
            else if (state.currentPeriod === 'afternoon') sliderVal = 2;
            else if (state.currentPeriod === 'sunset') sliderVal = 3;
            else if (state.currentPeriod === 'night') sliderVal = 4;
            slider.value = sliderVal;
        }
    }
    
    // Sincronizar os seletores do painel de acessibilidade (se existirem na página)
    const chkHighContrast = document.getElementById('chk-high-contrast');
    if (chkHighContrast) chkHighContrast.checked = state.accessibility.highContrast;
    const chkLargeFont = document.getElementById('chk-large-font');
    if (chkLargeFont) chkLargeFont.checked = state.accessibility.largeFont;
    const chkReduceMotion = document.getElementById('chk-reduce-motion');
    if (chkReduceMotion) chkReduceMotion.checked = state.accessibility.reduceMotion;
    const chkAnxietyMode = document.getElementById('chk-anxiety-mode');
    if (chkAnxietyMode) chkAnxietyMode.checked = state.accessibility.anxietyMode;
    
    // Atualizar texto de status de horário (se existir)
    const textStatus = document.getElementById('time-status-text');
    if (textStatus) {
        const now = new Date();
        const HH = String(now.getHours()).padStart(2, '0');
        const MM = String(now.getMinutes()).padStart(2, '0');
        
        let periodName = 'Noite';
        if (state.currentPeriod === 'morning') periodName = 'Manhã';
        else if (state.currentPeriod === 'afternoon') periodName = 'Tarde';
        else if (state.currentPeriod === 'sunset') periodName = 'Entardecer';
        
        let choiceName = 'Automático';
        if (state.themeChoice === 'morning') choiceName = 'Manhã';
        else if (state.themeChoice === 'afternoon') choiceName = 'Tarde';
        else if (state.themeChoice === 'night') choiceName = 'Noite';
        else if (state.themeChoice === 'light') choiceName = 'Claro';
        else if (state.themeChoice === 'dark') choiceName = 'Escuro';
        
        textStatus.innerHTML = `Sintonia Ativa: <strong>${choiceName}</strong> (Atmosfera: <strong>${periodName}</strong> - <strong>${state.lightingMode === 'light' ? 'Claro' : 'Escuro'}</strong>).`;
    }
}

/* ==========================================================================
   3. NAVEGAÇÃO DE ABAS NOS MOCKUPS
   ========================================================================== */
function switchMockupTab(tabId) {
    // 1. Remover classe active de todas as abas de navegação
    document.querySelectorAll('.btn-tab').forEach(btn => btn.classList.remove('active'));
    // 2. Remover classe active de todos os menus laterais
    document.querySelectorAll('.mockup-sidebar .sidebar-menu li').forEach(li => li.classList.remove('active'));
    // 3. Ocultar todas as telas do mockup
    document.querySelectorAll('.mockup-screen').forEach(scr => scr.classList.remove('active'));
    
    // 4. Ativar os elementos selecionados
    const activeTabBtn = document.getElementById(`tab-${tabId}`);
    if (activeTabBtn) activeTabBtn.classList.add('active');
    
    const activeSidebarLi = document.getElementById(`sidemenu-${tabId}`);
    if (activeSidebarLi) activeSidebarLi.classList.add('active');
    
    const activeScreen = document.getElementById(`screen-${tabId}`);
    if (activeScreen) activeScreen.classList.add('active');
    
    // 5. Atualizar o título da barra superior da janela do mockup
    const windowTitle = document.getElementById('mockup-window-title');
    if (windowTitle && mockupTitles[tabId]) {
        windowTitle.innerText = mockupTitles[tabId];
    }
    
    // Rola para a tela do mockup suavemente no mobile se necessário
    if (window.innerWidth < 900) {
        document.querySelector('.mockup-frame').scrollIntoView({ behavior: 'smooth' });
    }
}

/* ==========================================================================
   4. GUIA DE ESTILO: COPIAR CORES
   ========================================================================== */
function copyColorHex(hex, element) {
    // Copiar código hexadecimal para o clipboard
    navigator.clipboard.writeText(hex).then(() => {
        // Adiciona classe para exibir animação/popover de cópia sucedida
        element.classList.add('copied');
        
        setTimeout(() => {
            element.classList.remove('copied');
        }, 1500);
    }).catch(err => {
        console.error('Erro ao copiar cor: ', err);
    });
}

/* ==========================================================================
   5. MOCKUP: FORMULÁRIO BARALHO INTERATIVO E CÁLCULO
   ========================================================================== */
let selectedQuantity = 1;

function handleRadioQuantityChange(radioInput) {
    // Remover classe active de todos os labels
    document.querySelectorAll('.card-quantity-selector .card-radio').forEach(lbl => {
        lbl.classList.remove('active');
    });
    
    // Adicionar classe active ao label pai do input checado
    radioInput.parentElement.classList.add('active');
    
    // Atribui o valor da quantidade
    if (radioInput.value === 'custom') {
        // Solicita quantidade personalizada ou define um padrão fictício
        const customVal = prompt("Digite a quantidade de perguntas adicionais desejada (máximo 10):", "5");
        const parsed = parseInt(customVal);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 10) {
            selectedQuantity = parsed;
            radioInput.parentElement.querySelector('.radio-price').innerText = `${parsed} Perg.`;
        } else {
            selectedQuantity = 4;
            radioInput.parentElement.querySelector('.radio-price').innerText = `4 Perg.`;
        }
    } else {
        selectedQuantity = parseInt(radioInput.value);
    }
    
    calculateTarotPrice();
}

function calculateTarotPrice() {
    const areaEl = document.getElementById('sel-area');
    const urgencyEl = document.getElementById('sel-urgencia');
    const display = document.getElementById('tarot-price-display');
    
    if (!areaEl || !urgencyEl || !display) return;
    
    const area = areaEl.value;
    const urgency = parseFloat(urgencyEl.value);
    
    // Valor Base por Pergunta
    let basePricePerQuestion = 15.00;
    let baseTotal = basePricePerQuestion * selectedQuantity;
    
    // Multiplicador por Área da Vida
    let areaMultiplier = 1.0;
    switch (area) {
        case 'amor': areaMultiplier = 1.0; break;
        case 'carreira': areaMultiplier = 1.1; break;
        case 'saude': areaMultiplier = 1.15; break;
        case 'espiritualidade': areaMultiplier = 0.9; break; // Desconto místico
    }
    
    // Multiplicador por Urgência (Urgência 1x, 1.5x, 2.5x)
    let urgencyMultiplier = 1.0;
    if (urgency === 1.5) urgencyMultiplier = 1.25;
    else if (urgency === 2.5) urgencyMultiplier = 1.6;
    
    // Cálculo final
    let finalPrice = baseTotal * areaMultiplier * urgencyMultiplier;
    
    // Formatando moeda BR
    display.innerText = finalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function triggerSimulatedTiragem() {
    const pergunta = document.getElementById('txt-pergunta').value.trim();
    
    if (pergunta === '') {
        alert("Por favor, digite sua pergunta antes de realizar o envio ritualístico.");
        document.getElementById('txt-pergunta').focus();
        return;
    }
    
    // Simulação de envio com efeito sonoro visual
    alert(`Sua pergunta: "${pergunta}" foi enviada com sucesso! \nAs energias já estão sendo canalizadas e o baralho está sendo preparado.`);
    document.getElementById('txt-pergunta').value = '';
}

// Virada de Carta Mística no painel direito
let cardFlipped = false;

function flipMysticCard() {
    const cardElement = document.querySelector('.mystic-tarot-card.active');
    const conselhoBox = document.getElementById('conselho-box');
    
    if (!cardElement || !conselhoBox) return;
    
    cardFlipped = !cardFlipped;
    
    if (cardFlipped) {
        cardElement.classList.add('flipped');
        
        // Selecionar um conselho aleatório
        const randIndex = Math.floor(Math.random() * conselhosEspirituais.length);
        const conselho = conselhosEspirituais[randIndex];
        
        // Atualizar conteúdo interno da carta (frente)
        const textNome = cardElement.querySelector('.card-front-face text:nth-of-type(1)');
        const textTema = cardElement.querySelector('.card-front-face text:nth-of-type(2)');
        
        if (textNome) textNome.textContent = conselho.carta;
        if (textTema) textTema.textContent = conselho.tema;
        
        // Exibir caixa de conselho expandida
        conselhoBox.querySelector('h4').innerText = `Conselho: ${conselho.carta}`;
        conselhoBox.querySelector('p').innerText = conselho.texto;
        
        conselhoBox.classList.remove('hide');
    } else {
        cardElement.classList.remove('flipped');
        conselhoBox.classList.add('hide');
    }
}

/* ==========================================================================
   6. PAINEL DE CONFIGURAÇÕES DE ACESSIBILIDADE
   ========================================================================== */
function toggleAccessibilityMenu() {
    const drawer = document.getElementById('accessibility-drawer');
    if (drawer) {
        drawer.classList.toggle('active');
    }
}

function toggleAccessibilityFeature(feature) {
    switch (feature) {
        case 'high-contrast':
            state.accessibility.highContrast = document.getElementById('chk-high-contrast').checked;
            break;
        case 'large-font':
            state.accessibility.largeFont = document.getElementById('chk-large-font').checked;
            break;
        case 'reduce-motion':
            state.accessibility.reduceMotion = document.getElementById('chk-reduce-motion').checked;
            break;
        case 'anxiety-mode':
            state.accessibility.anxietyMode = document.getElementById('chk-anxiety-mode').checked;
            break;
    }
    applyStateToDOM();
}

function changeThemeChoice(choice) {
    state.themeChoice = choice;
    applyTheme();
}

// Mudar apenas o período (mantém luminosidade)
function setThemePeriod(period) {
    state.themeChoice = period;
    state.currentPeriod = period;
    applyTheme();
}

// Mudar apenas a luminosidade (mantém período)
function setThemeLighting(mode) {
    state.lightingMode = mode;
    // Se themeChoice era 'auto' ou um modo de luz, atualizar para período atual
    if (['auto','light','medium','dark'].includes(state.themeChoice)) {
        state.themeChoice = state.currentPeriod;
    }
    applyStateToDOM();
}

/* ==========================================================================
   WIDGET FLUTUANTE DE TEMA (SELETOR DE FASE)
   Injetado em TODAS as páginas automaticamente
   ========================================================================== */
function createThemeWidget() {
    // Não criar duplicata
    if (document.getElementById('themeFab')) return;
    
    const fab = document.createElement('div');
    fab.className = 'theme-fab';
    fab.id = 'themeFab';
    fab.innerHTML = `
        <div class="theme-fab-panel" id="themeFabPanel">
            <div class="theme-fab-label">Período</div>
            <div class="theme-fab-options" id="themeFabPeriodOptions">
                <button class="theme-fab-btn" data-period="auto" onclick="setThemePeriodFromWidget('auto')">⚡ Auto</button>
                <button class="theme-fab-btn" data-period="morning" onclick="setThemePeriodFromWidget('morning')">🌅 Manhã</button>
                <button class="theme-fab-btn" data-period="afternoon" onclick="setThemePeriodFromWidget('afternoon')">☀️ Tarde</button>
                <button class="theme-fab-btn" data-period="sunset" onclick="setThemePeriodFromWidget('sunset')">🌆 Entardecer</button>
                <button class="theme-fab-btn" data-period="night" onclick="setThemePeriodFromWidget('night')">🌙 Noite</button>
            </div>
            <div class="theme-fab-divider"></div>
            <div class="theme-fab-label">Luminosidade</div>
            <div class="theme-fab-options" id="themeFabLightOptions">
                <button class="theme-fab-btn" data-light="light" onclick="setThemeLightingFromWidget('light')">☀️ Claro</button>
                <button class="theme-fab-btn" data-light="medium" onclick="setThemeLightingFromWidget('medium')">🌓 Médio</button>
                <button class="theme-fab-btn" data-light="dark" onclick="setThemeLightingFromWidget('dark')">🌑 Escuro</button>
            </div>
        </div>
        <button class="theme-fab-toggle" id="themeFabToggle" aria-label="Selecionar tema" title="Selecionar Fase e Luminosidade">
            🌙
        </button>
    `;
    document.body.appendChild(fab);
    
    // Toggle painel
    const toggle = document.getElementById('themeFabToggle');
    const panel = document.getElementById('themeFabPanel');
    
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('open');
        updateWidgetActiveStates();
    });
    
    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
        if (!fab.contains(e.target)) {
            panel.classList.remove('open');
        }
    });
    
    updateWidgetActiveStates();
}

function updateWidgetActiveStates() {
    // Atualizar botões de período
    document.querySelectorAll('#themeFabPeriodOptions .theme-fab-btn').forEach(btn => {
        const period = btn.dataset.period;
        if (period === 'auto') {
            btn.classList.toggle('active', state.themeChoice === 'auto');
        } else {
            btn.classList.toggle('active', state.currentPeriod === period && state.themeChoice !== 'auto');
        }
    });
    
    // Atualizar botões de luminosidade
    document.querySelectorAll('#themeFabLightOptions .theme-fab-btn').forEach(btn => {
        btn.classList.toggle('active', state.lightingMode === btn.dataset.light);
    });
    
    // Atualizar ícone do FAB
    const toggle = document.getElementById('themeFabToggle');
    if (toggle) {
        const icons = { morning: '🌅', afternoon: '☀️', sunset: '🌆', night: '🌙' };
        toggle.textContent = icons[state.currentPeriod] || '🌙';
    }
}

function setThemePeriodFromWidget(period) {
    if (period === 'auto') {
        state.themeChoice = 'auto';
    } else {
        state.themeChoice = period;
        state.currentPeriod = period;
    }
    applyTheme();
    updateWidgetActiveStates();
}

function setThemeLightingFromWidget(mode) {
    state.lightingMode = mode;
    if (state.themeChoice === 'auto') {
        state.themeChoice = state.currentPeriod;
    }
    // Se themeChoice era um modo de luminosidade puro, atualizar
    if (['light','medium','dark'].includes(state.themeChoice)) {
        state.themeChoice = state.currentPeriod;
    }
    applyStateToDOM();
    updateWidgetActiveStates();
}

/* ==========================================================================
   7. MENU RESPONSIVO MOBILE
   ========================================================================== */
function initResponsiveMobileMenu() {
    // Procura sidebar da cartomante ou do cliente
    const sidebar = document.querySelector('.sidebar') || document.querySelector('.client-sidebar');
    if (!sidebar) return;

    // Criar overlay se não existir
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }

    // Criar botão hambúrguer se não existir
    let toggleBtn = document.querySelector('.mobile-toggle-btn');
    if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.className = 'mobile-toggle-btn';
        toggleBtn.setAttribute('aria-label', 'Abrir menu lateral');
        toggleBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
        `;
        document.body.appendChild(toggleBtn);
    }

    // Eventos de clique
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });

    // Fechar ao clicar nos links do menu (em telas menores)
    const links = sidebar.querySelectorAll('a, li');
    links.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 900) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    });
}

/* ==========================================================================
   8. CENTRAL DE NOTIFICAÇÕES GLOBAL
   ========================================================================== */
let globalLoggedUser = null;
let globalSupabase = null;

function getGlobalSupabase() {
    if (globalSupabase) return globalSupabase;
    const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL) || "https://YOUR_PROJECT_REF.supabase.co";
    const SUPABASE_ANON_KEY = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || "YOUR_PUBLIC_ANON_KEY";
    try {
        if (typeof supabaseCreateClient === "function") {
            globalSupabase = supabaseCreateClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } else if (typeof window.supabase !== "undefined") {
            globalSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
    } catch (e) {
        console.warn("Supabase não disponível no script global.");
    }
    return globalSupabase;
}

async function testGlobalSupabaseConnection() {
    const s = getGlobalSupabase();
    if (!s || s.supabaseUrl.includes("YOUR_PROJECT_REF")) return false;
    try {
        const { data, error } = await s.from("conversas").select("id").limit(1);
        return error ? false : true;
    } catch (e) {
        return false;
    }
}

function getLocalNotifications() {
    const list = localStorage.getItem("cartomante_notificacoes");
    if (!list) {
        const demos = [
            { id: "demo-1", titulo: "Pergunta pendente", mensagem: "Valentina Rocha enviou uma Pergunta ao Baralho.", tipo: "pergunta", lida: false, created_at: new Date().toISOString() },
            { id: "demo-2", titulo: "Consulta Agendada", mensagem: "Novo atendimento agendado para amanhã às 14:00.", tipo: "atendimento", lida: false, created_at: new Date().toISOString() }
        ];
        localStorage.setItem("cartomante_notificacoes", JSON.stringify(demos));
        return demos;
    }
    try {
        return JSON.parse(list);
    } catch (e) {
        return [];
    }
}

function saveLocalNotifications(list) {
    localStorage.setItem("cartomante_notificacoes", JSON.stringify(list));
}

// Expõe globalmente para criar notificações em modo contingência
window.addLocalNotification = function(titulo, mensagem, tipo, metadata = {}) {
    const list = getLocalNotifications();
    const newNotif = {
        id: "local-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        titulo,
        mensagem,
        tipo,
        lida: false,
        created_at: new Date().toISOString(),
        ...metadata
    };
    list.unshift(newNotif);
    saveLocalNotifications(list);
    
    // Disparar o toast na tela
    const isClient = window.location.pathname.includes("client_") || document.getElementById("clientActionsWidget") !== null;
    let linkChat = null;
    if (tipo === "mensagem" || tipo === "pergunta") {
        linkChat = isClient ? "client_chat.html" : "chat.html";
        if (newNotif.conversa_id) linkChat += `?cid=${newNotif.conversa_id}`;
        if (tipo === "pergunta") linkChat += (linkChat.includes("?") ? "&" : "?") + "tab=perguntas";
    }
    if (typeof window.showToastNotification === "function") {
        window.showToastNotification(titulo, mensagem, tipo, linkChat);
    }
    
    if (globalLoggedUser) {
        loadGlobalNotifications(globalLoggedUser);
    }
    return newNotif;
};

async function initGlobalNotifications() {
    const s = getGlobalSupabase();
    if (!s) {
        globalLoggedUser = { id: "demo_user", email: "demo@cartasnamesa.com" };
        await loadGlobalNotifications(globalLoggedUser);
        return;
    }
    const isConnected = await testGlobalSupabaseConnection();
    if (!isConnected) {
        globalLoggedUser = { id: "demo_user", email: "demo@cartasnamesa.com" };
        await loadGlobalNotifications(globalLoggedUser);
        return;
    }

    try {
        const { data: { user } } = await s.auth.getUser();
        if (user) {
            globalLoggedUser = user;
            await loadGlobalNotifications(user);
            subscribeGlobalNotifications(user);
        } else {
            globalLoggedUser = { id: "demo_user", email: "demo@cartasnamesa.com" };
            await loadGlobalNotifications(globalLoggedUser);
        }
    } catch (e) {
        globalLoggedUser = { id: "demo_user", email: "demo@cartasnamesa.com" };
        await loadGlobalNotifications(globalLoggedUser);
    }
}

async function loadGlobalNotifications(user) {
    const s = getGlobalSupabase();
    const isSupabaseOnline = s && !s.supabaseUrl.includes("YOUR_PROJECT_REF") && await testGlobalSupabaseConnection();
    
    if (isSupabaseOnline && user && !user.id.startsWith("demo")) {
        const { data: list, error } = await s
            .from("notificacoes")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10);

        if (error) {
            console.error("Erro ao carregar notificações globais:", error);
            renderGlobalNotifications(getLocalNotifications());
            return;
        }
        renderGlobalNotifications(list || []);
    } else {
        renderGlobalNotifications(getLocalNotifications());
    }
}

function renderGlobalNotifications(list) {
    const container = document.getElementById("notifListContainer");
    const badge = document.getElementById("notifBadge");
    if (!container) return;

    container.innerHTML = "";
    const unreadCount = list.filter(n => !n.lida).length;

    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.classList.remove("hidden");
        } else {
            badge.classList.add("hidden");
        }
    }

    if (list.length === 0) {
        container.innerHTML = `<p style="font-size:0.78rem; font-style:italic; color:var(--text-muted); text-align:center; padding:15px 0; margin:0;">Nenhum aviso no momento.</p>`;
        return;
    }

    list.forEach(n => {
        const item = document.createElement("div");
        item.className = "notif-item";
        item.style.padding = "10px";
        item.style.borderRadius = "8px";
        item.style.background = n.lida ? "rgba(255, 255, 255, 0.02)" : "rgba(199, 162, 122, 0.08)";
        item.style.border = "1px solid rgba(255, 255, 255, 0.03)";
        item.style.fontSize = "0.78rem";
        item.style.display = "flex";
        item.style.flexDirection = "column";
        item.style.gap = "4px";
        item.style.cursor = "pointer";
        item.style.transition = "background 0.2s, transform 0.1s";
        
        // Efeito de hover dinâmico
        item.onmouseenter = () => {
            item.style.background = "rgba(199, 162, 122, 0.15)";
            item.style.transform = "translateY(-1px)";
        };
        item.onmouseleave = () => {
            item.style.background = n.lida ? "rgba(255, 255, 255, 0.02)" : "rgba(199, 162, 122, 0.08)";
            item.style.transform = "translateY(0)";
        };

        let icon = "fa-bell";
        if (n.tipo === "mensagem") icon = "fa-comments";
        else if (n.tipo === "pergunta") icon = "fa-crown";
        else if (n.tipo === "pagamento") icon = "fa-wallet";
        else if (n.tipo === "atendimento") icon = "fa-calendar-check";

        item.onclick = (e) => {
            // Se clicar nos botões internos de ação, previne o clique no card
            if (e.target.closest("button") || e.target.closest("i.fa-trash") || e.target.closest("i.fa-check")) return;
            window.handleNotificationClick(n.id, n.tipo, n.conversa_id || (n.metadata && n.metadata.conversa_id));
        };

        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; font-weight:600; color:var(--gold-color);">
                <span><i class="fas ${icon}" style="margin-right:5px;"></i> ${n.titulo}</span>
                <div style="display:flex; gap:6px;">
                    ${!n.lida ? `<button onclick="event.stopPropagation(); window.markGlobalAsRead('${n.id}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:0.7rem;" title="Marcar como lida"><i class="fas fa-check"></i></button>` : ''}
                    <button onclick="event.stopPropagation(); window.deleteGlobalNotification('${n.id}', event)" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:0.7rem;" title="Excluir"><i class="fas fa-trash" style="color: rgba(230, 57, 70, 0.65);"></i></button>
                </div>
            </div>
            <div style="color:var(--text-secondary); line-height:1.3;">${n.mensagem}</div>
            <div style="font-size:0.65rem; color:var(--text-muted); margin-top:2px;">${new Date(n.created_at).toLocaleDateString()} ${new Date(n.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
        `;
        container.appendChild(item);
    });
}

window.handleNotificationClick = function(id, tipo, conversa_id) {
    window.markGlobalAsRead(id);
    
    // Fechar menu de notificações
    const menu = document.getElementById("notificationsMenu");
    if (menu) menu.classList.add("hidden");

    const isClient = window.location.pathname.includes("client_") || document.getElementById("clientActionsWidget") !== null;
    let url = "";
    
    if (tipo === "mensagem") {
        url = isClient ? "client_chat.html" : "chat.html";
        if (conversa_id) url += `?cid=${conversa_id}`;
    } else if (tipo === "pergunta") {
        url = isClient ? "client_chat.html" : "chat.html";
        if (conversa_id) {
            url += `?cid=${conversa_id}&tab=perguntas`;
        } else {
            url += `?tab=perguntas`;
        }
    } else if (tipo === "pagamento") {
        url = isClient ? "client_area.html#financeiro" : "finance.html?status=pendente";
    } else if (tipo === "atendimento") {
        url = isClient ? "client_area.html#agenda" : "agenda.html";
    } else {
        url = isClient ? "client_area.html" : "dashboard.html";
    }
    
    window.location.href = url;
};

window.toggleNotificationsMenu = function() {
    const menu = document.getElementById("notificationsMenu");
    if (menu) menu.classList.toggle("hidden");
};

window.deleteGlobalNotification = async function(id, e) {
    if (e) e.stopPropagation();
    const s = getGlobalSupabase();
    const isSupabaseOnline = s && !s.supabaseUrl.includes("YOUR_PROJECT_REF") && await testGlobalSupabaseConnection();
    
    if (isSupabaseOnline && globalLoggedUser && !globalLoggedUser.id.startsWith("demo")) {
        await s.from("notificacoes").delete().eq("id", id);
    } else {
        let list = getLocalNotifications();
        list = list.filter(n => n.id !== id);
        saveLocalNotifications(list);
    }
    await loadGlobalNotifications(globalLoggedUser);
};

window.markGlobalAsRead = async function(id) {
    const s = getGlobalSupabase();
    const isSupabaseOnline = s && !s.supabaseUrl.includes("YOUR_PROJECT_REF") && await testGlobalSupabaseConnection();
    
    if (isSupabaseOnline && globalLoggedUser && !globalLoggedUser.id.startsWith("demo")) {
        await s.from("notificacoes").update({ lida: true }).eq("id", id);
    } else {
        const list = getLocalNotifications();
        const item = list.find(n => n.id === id);
        if (item) {
            item.lida = true;
            saveLocalNotifications(list);
        }
    }
    await loadGlobalNotifications(globalLoggedUser);
};

window.markAsRead = window.markGlobalAsRead; // Alias para compatibilidade

window.markAllNotificationsAsRead = async function() {
    const s = getGlobalSupabase();
    const isSupabaseOnline = s && !s.supabaseUrl.includes("YOUR_PROJECT_REF") && await testGlobalSupabaseConnection();
    
    if (isSupabaseOnline && globalLoggedUser && !globalLoggedUser.id.startsWith("demo")) {
        await s.from("notificacoes").delete().eq("user_id", globalLoggedUser.id);
    } else {
        saveLocalNotifications([]);
    }
    await loadGlobalNotifications(globalLoggedUser);
};

function subscribeGlobalNotifications(user) {
    const s = getGlobalSupabase();
    if (!s) return;
    s.channel(`public:global_notificacoes_${user.id}`)
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "notificacoes", filter: `user_id=eq.${user.id}` },
            async (payload) => {
                await loadGlobalNotifications(user);
                
                // Se for uma nova notificação criada e não lida, dispara o Toast!
                if (payload.eventType === "INSERT" && payload.new && !payload.new.lida) {
                    let linkChat = null;
                    if (payload.new.tipo === "mensagem" || payload.new.tipo === "pergunta") {
                        const isClient = window.location.pathname.includes("client_") || document.getElementById("clientActionsWidget") !== null;
                        const baseUrl = isClient ? "client_chat.html" : "chat.html";
                        linkChat = baseUrl;
                        
                        // Obter o id da conversa se estiver disponível
                        if (payload.new.conversa_id) {
                            linkChat += `?cid=${payload.new.conversa_id}`;
                        } else if (payload.new.metadata) {
                            try {
                                const meta = typeof payload.new.metadata === 'string' ? JSON.parse(payload.new.metadata) : payload.new.metadata;
                                if (meta.conversa_id) {
                                    linkChat += `?cid=${meta.conversa_id}`;
                                }
                            } catch (e) {}
                        }
                    }
                    showToastNotification(payload.new.titulo, payload.new.mensagem, payload.new.tipo, linkChat);
                }
            }
        )
        .subscribe();
}

function showToastNotification(titulo, mensagem, tipo = 'sistema', linkChat = null) {
    let container = document.getElementById('mystic-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'mystic-toast-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.maxWidth = '360px';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `mystic-toast ${tipo}`;
    toast.style.cursor = linkChat ? 'pointer' : 'default';
    
    let icon = "fa-bell";
    if (tipo === "mensagem") icon = "fa-comments";
    else if (tipo === "pergunta") icon = "fa-crown";
    else if (tipo === "pagamento") icon = "fa-wallet";
    else if (tipo === "atendimento") icon = "fa-calendar-check";

    toast.innerHTML = `
        <div class="toast-header">
            <span class="toast-title"><i class="fas ${icon}"></i> ${titulo}</span>
            <button class="toast-close-btn">&times;</button>
        </div>
        <div class="toast-body">${mensagem}</div>
    `;

    // Ação de clicar para abrir o chat
    if (linkChat) {
        toast.addEventListener('click', (e) => {
            if (e.target.classList.contains('toast-close-btn')) return;
            window.location.href = linkChat;
        });
    }

    // Ação do botão fechar
    const closeBtn = toast.querySelector('.toast-close-btn');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeToast(toast);
    });

    container.appendChild(toast);

    // Auto sumir em 5 segundos
    const timeoutId = setTimeout(() => {
        removeToast(toast);
    }, 5000);

    toast.dataset.timeoutId = timeoutId;
}

function removeToast(toast) {
    toast.classList.add('fade-out');
    if (toast.dataset.timeoutId) {
        clearTimeout(parseInt(toast.dataset.timeoutId));
    }
    toast.addEventListener('transitionend', () => {
        toast.remove();
        const container = document.getElementById('mystic-toast-container');
        if (container && container.children.length === 0) {
            container.remove();
        }
    });
}

// Expõe a função globalmente para teste ou fallback
window.showToastNotification = showToastNotification;

function loadGlobalDemoNotifications() {
    renderGlobalNotifications([
        { id: "demo-1", titulo: "Aviso do Templo", mensagem: "Bem-vindo ao seu santuário místico. Conecte-se para receber notificações em tempo real.", tipo: "sistema", lida: false, created_at: new Date().toISOString() }
    ]);
}

// Fechar menu ao clicar fora
document.addEventListener("click", (e) => {
    const container = document.getElementById("notificationContainer");
    const menu = document.getElementById("notificationsMenu");
    if (container && !container.contains(e.target) && menu) {
        menu.classList.add("hidden");
    }
});

// ==========================================================================
// RITUALS FINANCEIROS E SEGURANÇA: AUXILIARES GLOBAIS (ONLINE & OFFLINE)
// ==========================================================================

// Verifica pendência ativa do cliente com outras cartomantes
window.checkClientGlobalPendency = async function(clienteId, currentCartomanteId) {
  if (!clienteId) return false;
  
  // Testar conexão Supabase
  let isConnected = false;
  if (window.supabase) {
    try {
      const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL) || "";
      if (SUPABASE_URL && !SUPABASE_URL.includes("YOUR_PROJECT_REF")) {
        const { data, error } = await window.supabase.from("conversas").select("id").limit(1);
        isConnected = !error;
      }
    } catch(e) {}
  }

  if (isConnected) {
    try {
      const { data, error } = await window.supabase
        .from("cartomante_clientes")
        .select("cartomante_id, status, bloqueado")
        .eq("cliente_id", clienteId);
      if (!error && data) {
        return data.some(v => v.cartomante_id !== currentCartomanteId && (v.status === 'pendente' || v.bloqueado));
      }
    } catch (e) {
      console.warn("Erro ao checar pendência global no Supabase:", e);
    }
  }

  // Fallback offline
  const vinculos = JSON.parse(localStorage.getItem("cartomante_clientes_vinculos") || "[]");
  return vinculos.some(v => v.cliente_id === clienteId && v.cartomante_id !== currentCartomanteId && (v.status === 'pendente' || v.bloqueado));
};

// Registra uma ação no log de auditoria imutável (historico_acoes)
window.logSecurityAction = async function(cartomanteId, clienteId, acao, detalhes, statusPedido = null, comprovanteAnexado = false, observacaoCartomante = null) {
  // Testar conexão Supabase
  let isConnected = false;
  if (window.supabase) {
    try {
      const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL) || "";
      if (SUPABASE_URL && !SUPABASE_URL.includes("YOUR_PROJECT_REF")) {
        const { data, error } = await window.supabase.from("conversas").select("id").limit(1);
        isConnected = !error;
      }
    } catch(e) {}
  }

  const payload = {
    cartomante_id: cartomanteId || "cartomante-luana",
    cliente_id: clienteId,
    acao: acao,
    detalhes: detalhes,
    status_pedido: statusPedido,
    comprovante_anexado: comprovanteAnexado,
    observacao_cartomante: observacaoCartomante,
    created_at: new Date().toISOString()
  };

  if (isConnected && window.supabase) {
    try {
      await window.supabase.from("historico_acoes").insert([payload]);
    } catch (e) {
      console.warn("Erro ao registrar log no Supabase:", e);
    }
  }

  // Gravar no LocalStorage para contingência offline
  const localLogs = JSON.parse(localStorage.getItem("cartomante_historico_acoes") || "[]");
  localLogs.push({
    id: "log-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
    ...payload
  });
  localStorage.setItem("cartomante_historico_acoes", JSON.stringify(localLogs));
};


