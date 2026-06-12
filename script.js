/* ==========================================================================
   INTERATIVIDADE E GERENCIAMENTO DE ESTADOS - SISTEMA CARTOMANTE
   JavaScript Vanilla Moderno
   ========================================================================== */

// Estados do Sistema
let state = {
    themeChoice: 'auto', // 'auto' | 'morning' | 'afternoon' | 'night' | 'light' | 'dark'
    lightingMode: 'dark', // 'light' | 'dark'
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
    
    // 6. Inicializar notificações globais
    initGlobalNotifications();
    
    // 7. Iniciar timer para atualizar o horário em tempo real (se automático estiver ativo)
    setInterval(() => {
        if (state.timeMode === 'auto') {
            updateAutomaticTime();
        }
    }, 60000); // Atualiza a cada minuto
});

/* ==========================================================================
   1. GERAÇÃO DE ESTRELAS (AMBIENTE MÍSTICO)
   ========================================================================== */
let starCanvasAnimFrame = null;

function generateStars() {
    const container = document.getElementById('stars-container');
    if (!container) return;
    
    // Evitar múltiplas inicializações se já estiver rodando
    if (document.getElementById('interactive-stars-canvas')) {
        return; 
    }
    
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'interactive-stars-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1';
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    let width = canvas.width = container.offsetWidth || window.innerWidth;
    let height = canvas.height = container.offsetHeight || window.innerHeight;
    
    window.addEventListener('resize', () => {
        if (!canvas) return;
        width = canvas.width = container.offsetWidth || window.innerWidth;
        height = canvas.height = container.offsetHeight || window.innerHeight;
    });
    
    const stars = [];
    const starCount = 100;
    
    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 2 + 0.5,
            speedX: (Math.random() - 0.5) * 0.1,
            speedY: (Math.random() - 0.5) * 0.1,
            twinklePhase: Math.random() * Math.PI * 2,
            twinkleSpeed: 0.01 + Math.random() * 0.02
        });
    }
    
    const sparkles = [];
    let mouse = { x: null, y: null, active: false };
    
    window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        mouse.active = true;
        
        if (state.accessibility && !state.accessibility.reduceMotion && Math.random() < 0.35) {
            sparkles.push({
                x: mouse.x,
                y: mouse.y,
                size: Math.random() * 2 + 0.8,
                speedX: (Math.random() - 0.5) * 1.5,
                speedY: (Math.random() - 0.5) * 1.5,
                alpha: 1.0,
                decay: 0.015 + Math.random() * 0.02,
                color: Math.random() < 0.5 ? '#C7A27A' : '#ECEFF5'
            });
        }
    });
    
    window.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
        mouse.active = false;
    });
    
    function animate() {
        if (state.accessibility && state.accessibility.reduceMotion) {
            ctx.clearRect(0, 0, width, height);
            stars.forEach(star => {
                ctx.fillStyle = `rgba(255, 255, 255, 0.75)`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
            });
            starCanvasAnimFrame = requestAnimationFrame(animate);
            return;
        }
        
        ctx.clearRect(0, 0, width, height);
        
        // Desenhar Estrelas
        stars.forEach(star => {
            star.x += star.speedX;
            star.y += star.speedY;
            
            if (mouse.active && mouse.x !== null && mouse.y !== null) {
                const dx = mouse.x - star.x;
                const dy = mouse.y - star.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 180) {
                    const force = (180 - dist) / 180;
                    const pullX = (dx / dist) * force * 0.8;
                    const pullY = (dy / dist) * force * 0.8;
                    const perpX = (-dy / dist) * force * 0.5;
                    const perpY = (dx / dist) * force * 0.5;
                    
                    star.x += pullX + perpX;
                    star.y += pullY + perpY;
                }
            }
            
            if (star.x < 0) star.x = width;
            if (star.x > width) star.x = 0;
            if (star.y < 0) star.y = height;
            if (star.y > height) star.y = 0;
            
            star.twinklePhase += star.twinkleSpeed;
            const opacity = Math.sin(star.twinklePhase) * 0.4 + 0.6;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
            
            if (star.size > 1.8 && opacity > 0.8) {
                ctx.strokeStyle = `rgba(199, 162, 122, ${opacity * 0.4})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(star.x - star.size * 3, star.y);
                ctx.lineTo(star.x + star.size * 3, star.y);
                ctx.moveTo(star.x, star.y - star.size * 3);
                ctx.lineTo(star.x, star.y + star.size * 3);
                ctx.stroke();
            }
        });
        
        // Desenhar Poeira Estelar
        for (let i = sparkles.length - 1; i >= 0; i--) {
            const sp = sparkles[i];
            sp.x += sp.speedX;
            sp.y += sp.speedY;
            sp.alpha -= sp.decay;
            
            if (sp.alpha <= 0) {
                sparkles.splice(i, 1);
                continue;
            }
            
            ctx.fillStyle = sp.color === '#C7A27A' ? `rgba(199, 162, 122, ${sp.alpha})` : `rgba(236, 239, 245, ${sp.alpha})`;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
            ctx.fill();
            
            if (sp.size > 2) {
                ctx.fillStyle = `rgba(255, 255, 255, ${sp.alpha * 0.5})`;
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, sp.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
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
        } else if (hours >= 12 && hours < 18) {
            state.currentPeriod = 'afternoon';
            state.lightingMode = 'light';
        } else {
            state.currentPeriod = 'night';
            state.lightingMode = 'dark';
        }
    } else if (state.themeChoice === 'morning') {
        state.currentPeriod = 'morning';
        state.lightingMode = 'light';
    } else if (state.themeChoice === 'afternoon') {
        state.currentPeriod = 'afternoon';
        state.lightingMode = 'light';
    } else if (state.themeChoice === 'night') {
        state.currentPeriod = 'night';
        state.lightingMode = 'dark';
    } else if (state.themeChoice === 'light') {
        state.lightingMode = 'light';
        if (state.currentPeriod === 'night' || state.currentPeriod === 'sunset') {
            state.currentPeriod = 'morning';
        }
    } else if (state.themeChoice === 'dark') {
        state.lightingMode = 'dark';
        if (state.currentPeriod === 'morning' || state.currentPeriod === 'afternoon') {
            state.currentPeriod = 'night';
        }
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
    body.classList.remove('mode-light', 'mode-dark');
    
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

async function initGlobalNotifications() {
    const s = getGlobalSupabase();
    if (!s) {
        loadGlobalDemoNotifications();
        return;
    }
    const isConnected = await testGlobalSupabaseConnection();
    if (!isConnected) {
        loadGlobalDemoNotifications();
        return;
    }

    try {
        const { data: { user } } = await s.auth.getUser();
        if (user) {
            globalLoggedUser = user;
            await loadGlobalNotifications(user);
            subscribeGlobalNotifications(user);
        } else {
            loadGlobalDemoNotifications();
        }
    } catch (e) {
        loadGlobalDemoNotifications();
    }
}

async function loadGlobalNotifications(user) {
    const s = getGlobalSupabase();
    if (!s) return;

    const { data: list, error } = await s
        .from("notificacoes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

    if (error) {
        console.error("Erro ao carregar notificações globais:", error);
        return;
    }

    renderGlobalNotifications(list || []);
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
        item.style.padding = "10px";
        item.style.borderRadius = "8px";
        item.style.background = n.lida ? "rgba(255, 255, 255, 0.01)" : "rgba(199, 162, 122, 0.08)";
        item.style.border = "1px solid rgba(255, 255, 255, 0.03)";
        item.style.fontSize = "0.78rem";
        item.style.display = "flex";
        item.style.flexDirection = "column";
        item.style.gap = "4px";

        let icon = "fa-bell";
        if (n.tipo === "mensagem") icon = "fa-comments";
        else if (n.tipo === "pergunta") icon = "fa-crown";
        else if (n.tipo === "pagamento") icon = "fa-wallet";
        else if (n.tipo === "atendimento") icon = "fa-calendar-check";

        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; font-weight:600; color:var(--gold-color);">
                <span><i class="fas ${icon}" style="margin-right:5px;"></i> ${n.titulo}</span>
                ${!n.lida ? `<button onclick="markGlobalAsRead('${n.id}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:0.65rem;" title="Marcar como lida"><i class="fas fa-check"></i></button>` : ''}
            </div>
            <div style="color:var(--text-secondary); line-height:1.3;">${n.mensagem}</div>
            <div style="font-size:0.65rem; color:var(--text-muted); margin-top:2px;">${new Date(n.created_at).toLocaleDateString()} ${new Date(n.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
        `;
        container.appendChild(item);
    });
}

window.toggleNotificationsMenu = function() {
    const menu = document.getElementById("notificationsMenu");
    if (menu) menu.classList.toggle("hidden");
};

window.markGlobalAsRead = async function(id) {
    const s = getGlobalSupabase();
    if (!s || !globalLoggedUser) return;
    await s.from("notificacoes").update({ lida: true }).eq("id", id);
    await loadGlobalNotifications(globalLoggedUser);
};

window.markAsRead = window.markGlobalAsRead; // Alias para compatibilidade

window.markAllNotificationsAsRead = async function() {
    const s = getGlobalSupabase();
    if (!s || !globalLoggedUser) return;
    await s.from("notificacoes").update({ lida: true }).eq("user_id", globalLoggedUser.id);
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

