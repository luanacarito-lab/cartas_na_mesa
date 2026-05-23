/* ==========================================================================
   INTERATIVIDADE E GERENCIAMENTO DE ESTADOS - SISTEMA CARTOMANTE
   JavaScript Vanilla Moderno
   ========================================================================== */

// Estados do Sistema
let state = {
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
    
    // 5. Iniciar timer para atualizar o horário em tempo real (se automático estiver ativo)
    setInterval(() => {
        if (state.timeMode === 'auto') {
            updateAutomaticTime();
        }
    }, 60000); // Atualiza a cada minuto
});

/* ==========================================================================
   1. GERAÇÃO DE ESTRELAS (AMBIENTE MÍSTICO)
   ========================================================================== */
function generateStars() {
    const container = document.getElementById('stars-container');
    if (!container) return;
    
    container.innerHTML = '';
    const starCount = 80;
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        
        // Coordenadas aleatórias
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        
        // Tamanhos variados (pequenos e delicados)
        const size = Math.random() * 2 + 0.8;
        
        // Atraso de animação para cintilação orgânica
        const delay = Math.random() * 5;
        const duration = Math.random() * 3 + 2;
        
        star.style.left = `${x}%`;
        star.style.top = `${y}%`;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.animationDelay = `${delay}s`;
        star.style.animationDuration = `${duration}s`;
        
        container.appendChild(star);
    }
}

/* ==========================================================================
   2. SISTEMA DINÂMICO DE HORÁRIOS & TEMAS
   ========================================================================== */
function initTimeSystem() {
    // Verifica preferência anterior ou detecta automático
    updateAutomaticTime();
}

function updateAutomaticTime() {
    const now = new Date();
    const hours = now.getHours();
    
    // Regra de transição baseada nas horas reais do usuário
    let period = 'night';
    if (hours >= 6 && hours < 12) {
        period = 'morning';
    } else if (hours >= 12 && hours < 18) {
        period = 'afternoon';
    } else if (hours >= 18 && hours < 20) {
        period = 'sunset';
    } else {
        period = 'night';
    }
    
    if (state.timeMode === 'auto') {
        state.currentPeriod = period;
        applyStateToDOM();
    }
}

function setLightingMode(mode) {
    state.lightingMode = mode;
    
    // Atualizar botões no cabeçalho
    document.getElementById('btn-mode-dark').classList.toggle('active', mode === 'dark');
    document.getElementById('btn-mode-light').classList.toggle('active', mode === 'light');
    
    applyStateToDOM();
}

function setTimeMode(mode) {
    state.timeMode = mode;
    
    // Atualizar botões no cabeçalho
    document.getElementById('btn-time-auto').classList.toggle('active', mode === 'auto');
    document.getElementById('btn-time-manual').classList.toggle('active', mode === 'manual');
    
    if (mode === 'auto') {
        // Trava o slider de controle manual
        document.getElementById('time-range-slider').disabled = true;
        document.getElementById('time-range-slider').style.opacity = '0.5';
        updateAutomaticTime();
    } else {
        // Destrava o slider
        document.getElementById('time-range-slider').disabled = false;
        document.getElementById('time-range-slider').style.opacity = '1';
    }
    
    applyStateToDOM();
}

function handleSliderChange(val) {
    if (state.timeMode === 'auto') return;
    
    let period = 'night';
    switch (parseInt(val)) {
        case 1: period = 'morning'; break;
        case 2: period = 'afternoon'; break;
        case 3: period = 'sunset'; break;
        case 4: period = 'night'; break;
    }
    
    state.currentPeriod = period;
    applyStateToDOM();
}

function selectPeriod(period) {
    // Força o modo manual se clicar em um card específico
    setTimeMode('manual');
    state.currentPeriod = period;
    
    // Sincroniza o slider de horário
    let sliderVal = 4;
    if (period === 'morning') sliderVal = 1;
    else if (period === 'afternoon') sliderVal = 2;
    else if (period === 'sunset') sliderVal = 3;
    else if (period === 'night') sliderVal = 4;
    
    document.getElementById('time-range-slider').value = sliderVal;
    
    applyStateToDOM();
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
    
    // Atualizar os cards de atmosfera para realçar o ativo
    document.getElementById('card-morning').classList.toggle('active', state.currentPeriod === 'morning');
    document.getElementById('card-afternoon').classList.toggle('active', state.currentPeriod === 'afternoon');
    document.getElementById('card-sunset').classList.toggle('active', state.currentPeriod === 'sunset');
    document.getElementById('card-night').classList.toggle('active', state.currentPeriod === 'night');
    
    // Atualizar o slider caso esteja no modo manual
    if (state.timeMode === 'manual') {
        let sliderVal = 4;
        if (state.currentPeriod === 'morning') sliderVal = 1;
        else if (state.currentPeriod === 'afternoon') sliderVal = 2;
        else if (state.currentPeriod === 'sunset') sliderVal = 3;
        else if (state.currentPeriod === 'night') sliderVal = 4;
        document.getElementById('time-range-slider').value = sliderVal;
    }
    
    // Atualizar texto de status de horário
    const now = new Date();
    const HH = String(now.getHours()).padStart(2, '0');
    const MM = String(now.getMinutes()).padStart(2, '0');
    const textStatus = document.getElementById('time-status-text');
    
    let periodName = 'Noite';
    if (state.currentPeriod === 'morning') periodName = 'Manhã';
    else if (state.currentPeriod === 'afternoon') periodName = 'Tarde';
    else if (state.currentPeriod === 'sunset') periodName = 'Entardecer';
    
    if (state.timeMode === 'auto') {
        textStatus.innerHTML = `Modo Automático: Adaptado para a <strong>${periodName}</strong> baseado no relógio do sistema (<strong>${HH}:${MM}</strong>).`;
    } else {
        textStatus.innerHTML = `Modo Manual: Atmosfera da <strong>${periodName}</strong> fixa por escolha do usuário.`;
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
    const area = document.getElementById('sel-area').value;
    const urgency = parseFloat(document.getElementById('sel-urgencia').value);
    const display = document.getElementById('tarot-price-display');
    
    if (!display) return;
    
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
    const body = document.body;
    
    switch (feature) {
        case 'high-contrast':
            state.accessibility.highContrast = document.getElementById('chk-high-contrast').checked;
            body.classList.toggle('accessibility-high-contrast', state.accessibility.highContrast);
            break;
            
        case 'large-font':
            state.accessibility.largeFont = document.getElementById('chk-large-font').checked;
            body.classList.toggle('accessibility-large-font', state.accessibility.largeFont);
            break;
            
        case 'reduce-motion':
            state.accessibility.reduceMotion = document.getElementById('chk-reduce-motion').checked;
            body.classList.toggle('accessibility-reduce-motion', state.accessibility.reduceMotion);
            break;
            
        case 'anxiety-mode':
            state.accessibility.anxietyMode = document.getElementById('chk-anxiety-mode').checked;
            body.classList.toggle('accessibility-anxiety-mode', state.accessibility.anxietyMode);
            break;
    }
}
