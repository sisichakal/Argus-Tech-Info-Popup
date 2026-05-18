// ==UserScript==
// @name         Argus Tech Info Popup
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Affiche un pop-in avec les informations techniques colorées sur l'Argus, y compris la puissance réelle maxi
// @author       You
// @match        https://www.largus.fr/fiche-technique/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=largus.fr
// @updateURL    https://raw.githubusercontent.com/sisichakal/Argus-Tech-Info-Popup/main/argus-tech-info-popup.user.js
// @downloadURL  https://raw.githubusercontent.com/sisichakal/Argus-Tech-Info-Popup/main/argus-tech-info-popup.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Only run on detailed spec pages (URL ends with a numeric ID, e.g. -2046379.html)
    if (!/\-\d+\.html$/.test(window.location.pathname)) {
        return;
    }

    const criteria = {
        longueur:    [4.20, 4.40, 4.50],
        reservoir:   [60, 50, 40],
        poids:       [1250, 1400, 1500],
        coffre:      [450, 400, 350],
        coffreUtile: [1300, 1100, 950],
        roues:       [18, 16, 15],
        vitesseMax:  [200, 190, 180],
        acceleration:[8, 9, 10],
        urbain:      [6, 7, 8],
        puissance:   [150, 120, 90],
    };

    // Prevent the popup from reappearing once the user has closed it
    let dismissed = false;

    function parseNumericValue(value) {
        if (!value || value === 'N/A') return null;
        const cleaned    = value.toString().replace(/[^\d,.-]/g, '');
        const normalized = cleaned.replace(',', '.');
        const num        = parseFloat(normalized);
        return isNaN(num) ? null : num;
    }

    function getColor(value, criteriaArray, isReverse = false) {
        const numValue = parseNumericValue(value);
        if (numValue === null) return { color: '#999999', background: '#99999920' };
        const [first, second, third] = criteriaArray;
        if (isReverse) {
            if (numValue <= first)  return { color: '#4CAF50', background: '#4CAF5020' };
            if (numValue <= second) return { color: '#FF9800', background: '#FF980020' };
            if (numValue <= third)  return { color: '#f44336', background: '#f4433620' };
            return { color: '#ffffff', background: '#000000' };
        } else {
            if (numValue >= first)  return { color: '#4CAF50', background: '#4CAF5020' };
            if (numValue >= second) return { color: '#FF9800', background: '#FF980020' };
            if (numValue >= third)  return { color: '#f44336', background: '#f4433620' };
            return { color: '#ffffff', background: '#000000' };
        }
    }

    function getArchitectureColor(value) {
        if (!value || value === 'N/A') return { color: '#999999', background: '#99999920' };
        const cylinderMatch = value.toString().toLowerCase().match(/(\w+)\s+cylindre/);
        if (!cylinderMatch) return { color: '#999999', background: '#99999920' };
        const numberWords = {
            'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4,
            'cinq': 5, 'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10,
        };
        const cylinderCount = numberWords[cylinderMatch[1]] || 0;
        return cylinderCount < 4
            ? { color: '#ffffff', background: '#000000' }
            : { color: '#4CAF50', background: '#4CAF5020' };
    }

    /**
     * Extract a value from the new largus.fr layout.
     *
     * The site now uses <table class="versions-table"> with simple
     * <tr><td>Label</td><td>Value</td></tr> rows instead of the old
     * .labelInfo / .valeur structure.
     *
     * We also fall back to the legacy .labelInfo / .valeur selectors
     * in case the old layout is still served on some pages.
     */
    function extractValue(searchTerms, isWeight = false, isVolume = false, isWheel = false) {
        // --- New layout: versions-table <td> pairs ---
        for (const term of searchTerms) {
            const allRows = document.querySelectorAll('table.versions-table tr');
            for (const row of allRows) {
                const cells = row.querySelectorAll('td');
                if (cells.length < 2) continue;

                const labelText = (cells[0].textContent || '').trim();
                if (!labelText.toLowerCase().includes(term.toLowerCase())) continue;

                const valueText = (cells[1].textContent || '').trim();
                if (!valueText) continue;

                if (isWheel) {
                    const wheelMatch = valueText.match(/R(\d+)/i);
                    if (wheelMatch) return wheelMatch[1];
                }
                if (isWeight || isVolume) {
                    const cleanText = valueText.replace(/(\d)\s+(\d)/g, '$1$2');
                    const match = cleanText.match(/[\d,]+\.?\d*/);
                    if (match && match[0] !== '') return match[0].replace(',', '.');
                } else {
                    const match = valueText.match(/[\d,]+\.?\d*/);
                    if (match && match[0] !== '') return match[0].replace(',', '.');
                }
            }
        }

        // --- Legacy layout fallback: .labelInfo / .valeur ---
        for (const term of searchTerms) {
            for (const labelElement of document.querySelectorAll('.labelInfo')) {
                const labelText = labelElement.textContent || labelElement.innerText || '';
                if (labelText.toLowerCase().includes(term.toLowerCase())) {
                    let valueElement = labelElement.nextElementSibling;
                    if (!valueElement || !valueElement.classList.contains('valeur')) {
                        const parent = labelElement.parentElement;
                        if (parent) valueElement = parent.querySelector('.valeur');
                    }
                    if (!valueElement || !valueElement.classList.contains('valeur')) {
                        let current = labelElement;
                        while (current.nextElementSibling) {
                            current = current.nextElementSibling;
                            if (current.classList.contains('valeur')) {
                                valueElement = current;
                                break;
                            }
                        }
                    }
                    if (valueElement && valueElement.classList.contains('valeur')) {
                        const valueText = valueElement.textContent || valueElement.innerText || '';
                        if (isWheel) {
                            const wheelMatch = valueText.match(/R(\d+)/i);
                            if (wheelMatch) return wheelMatch[1];
                        }
                        if (isWeight || isVolume) {
                            const cleanText = valueText.replace(/(\d)\s+(\d)/g, '$1$2');
                            const match = cleanText.match(/[\d,]+\.?\d*/);
                            if (match && match[0] !== '') return match[0].replace(',', '.');
                        } else {
                            const match = valueText.match(/[\d,]+\.?\d*/);
                            if (match && match[0] !== '') return match[0].replace(',', '.');
                        }
                    }
                }
            }
        }
        return 'N/A';
    }

    function extractArchitecture(searchTerms) {
        // --- New layout: versions-table <td> pairs ---
        for (const term of searchTerms) {
            const allRows = document.querySelectorAll('table.versions-table tr');
            for (const row of allRows) {
                const cells = row.querySelectorAll('td');
                if (cells.length < 2) continue;

                const labelText = (cells[0].textContent || '').trim();
                if (!labelText.toLowerCase().includes(term.toLowerCase())) continue;

                return (cells[1].textContent || '').trim();
            }
        }

        // --- Legacy layout fallback: .labelInfo / .valeur ---
        for (const term of searchTerms) {
            for (const labelElement of document.querySelectorAll('.labelInfo')) {
                const labelText = labelElement.textContent || labelElement.innerText || '';
                if (labelText.toLowerCase().includes(term.toLowerCase())) {
                    let valueElement = labelElement.nextElementSibling;
                    if (!valueElement || !valueElement.classList.contains('valeur')) {
                        const parent = labelElement.parentElement;
                        if (parent) valueElement = parent.querySelector('.valeur');
                    }
                    if (!valueElement || !valueElement.classList.contains('valeur')) {
                        let current = labelElement;
                        while (current.nextElementSibling) {
                            current = current.nextElementSibling;
                            if (current.classList.contains('valeur')) {
                                valueElement = current;
                                break;
                            }
                        }
                    }
                    if (valueElement && valueElement.classList.contains('valeur')) {
                        return (valueElement.textContent || valueElement.innerText || '').trim();
                    }
                }
            }
        }
        return 'N/A';
    }

    function createPopup() {
        if (dismissed || document.getElementById('argus-popup')) return;

        const data = {
            longueur:     extractValue(['longueur']),
            largeur:      extractValue(['largeur']),
            poids:        extractValue(['poids à vide'], true),
            coffre:       extractValue(['volume de coffre'], false, true),
            coffreUtile:  extractValue(['volume de coffre utile'], false, true),
            roues:        extractValue(['taille des roues avant'], false, false, true),
            puissance:    extractValue(['puissance réelle maxi']),
            vitesseMax:   extractValue(['vitesse maximale']),
            acceleration: extractValue(['0 à 100 km/h']),
            urbain:       extractValue(['cycle urbain']),
            mixte:        extractValue(['mixte']),
            extraUrbain:  extractValue(['extra urbain']),
            reservoir:    extractValue(['réservoir']),
            architecture: extractArchitecture(['architecture']),
            roueSecours:  extractArchitecture(['type de roue de secours', 'type de roues de secours']),
        };

        console.log('Valeurs extraites:', data);

        // If every single value is N/A, do not show the popup at all
        const hasAnyValue = Object.values(data).some(v => v !== 'N/A');
        if (!hasAnyValue) {
            console.log('[ArgusPopup] No data found, skipping popup.');
            return;
        }

        // --- Build combined display values ---

        // Longueur / Largeur — colour based on longueur
        const longueurLargeurDisplay = [
            data.longueur !== 'N/A' ? data.longueur + 'm' : 'N/A',
            data.largeur  !== 'N/A' ? data.largeur  + 'm' : 'N/A',
        ].join(' - ');
        const longueurLargeurColor = getColor(data.longueur, criteria.longueur, true);

        // Conso + range per type — one line each, colour based on each type's conso value
        function buildConsoLine(conso, reservoir) {
            const consoDisplay = conso !== 'N/A' ? conso + 'L' : 'N/A';
            const range        = calcRange(conso, reservoir);
            const rangeDisplay = range !== null ? range + ' km' : 'N/A';
            return consoDisplay + ' - ' + rangeDisplay;
        }

        const consoUrbainLine  = buildConsoLine(data.urbain,      data.reservoir);
        const consoMixteLine   = buildConsoLine(data.mixte,       data.reservoir);
        const consoExtraLine   = buildConsoLine(data.extraUrbain, data.reservoir);

        // Volume de coffre + volume utile — colour based on coffre normal
        const coffreDisplay = [
            data.coffre      !== 'N/A' ? data.coffre      + 'L' : 'N/A',
            data.coffreUtile !== 'N/A' ? data.coffreUtile + 'L' : 'N/A',
        ].join(' - ');
        const coffreColor = getColor(data.coffre, criteria.coffre, false);

        // Spare wheel icon — 🛞 (green) if "Normale", 🚫 otherwise (kit, etc.)
        const roueSecoursNormale = data.roueSecours !== 'N/A' &&
            data.roueSecours.toLowerCase().includes('normale');
        const roueSecoursIcon = data.roueSecours === 'N/A'
            ? ''
            : (roueSecoursNormale
                ? ' <span style="filter:hue-rotate(90deg) saturate(3) brightness(0.8);">🛞</span>'
                : ' 🚫');
        const rouesDisplay = (data.roues !== 'N/A' ? data.roues + '"' : 'N/A') + roueSecoursIcon;

        // Range calculation: (reservoir / conso) * 100 km
        function calcRange(conso, reservoir) {
            const consoNum     = parseNumericValue(conso);
            const reservoirNum = parseNumericValue(reservoir);
            if (!consoNum || !reservoirNum || consoNum === 0) return null;
            return Math.round((reservoirNum / consoNum) * 100);
        }

        // --- Popup shell ---

        const popup = document.createElement('div');
        popup.id = 'argus-popup';
        popup.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 380px;
            background: white;
            border: 2px solid #333;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            background: #333;
            color: white;
            padding: 10px;
            border-radius: 8px 8px 0 0;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <span>Informations Techniques v2.0</span>
            <span id="close-popup" style="cursor: pointer; font-size: 18px;">&times;</span>
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            padding: 15px;
            max-height: 600px;
            overflow-y: auto;
        `;

        const infos = [
            {
                label:    'Longueur / Largeur',
                display:  longueurLargeurDisplay,
                colorInfo: longueurLargeurColor,
            },
            {
                label:    'Poids à vide',
                display:  data.poids !== 'N/A' ? data.poids + ' kg' : 'N/A',
                colorInfo: getColor(data.poids, criteria.poids, true),
            },
            {
                label:    'Volume de coffre + volume utile',
                display:  coffreDisplay,
                colorInfo: coffreColor,
            },
            {
                label:    'Taille des roues avant',
                display:  rouesDisplay,
                colorInfo: getColor(data.roues, criteria.roues, false),
            },
            {
                label:    'Puissance réelle maxi',
                display:  data.puissance !== 'N/A' ? data.puissance + ' ch' : 'N/A',
                colorInfo: getColor(data.puissance, criteria.puissance, false),
            },
            {
                label:    'Vitesse maximale',
                display:  data.vitesseMax !== 'N/A' ? data.vitesseMax + ' km/h' : 'N/A',
                colorInfo: getColor(data.vitesseMax, criteria.vitesseMax, false),
            },
            {
                label:    '0 à 100 km/h',
                display:  data.acceleration !== 'N/A' ? data.acceleration + ' s' : 'N/A',
                colorInfo: getColor(data.acceleration, criteria.acceleration, true),
            },
            {
                label:    'Conso Urbain',
                display:  consoUrbainLine,
                colorInfo: getColor(data.urbain, criteria.urbain, true),
            },
            {
                label:    'Conso Mixte',
                display:  consoMixteLine,
                colorInfo: getColor(data.mixte, criteria.urbain, true),
            },
            {
                label:    'Conso Extra',
                display:  consoExtraLine,
                colorInfo: getColor(data.extraUrbain, criteria.urbain, true),
            },
            {
                label:    'Réservoir',
                display:  data.reservoir !== 'N/A' ? data.reservoir + ' L' : 'N/A',
                colorInfo: getColor(data.reservoir, criteria.reservoir, false),
            },
            {
                label:    'Architecture',
                display:  data.architecture,
                colorInfo: getArchitectureColor(data.architecture),
            },
        ];

        infos.forEach(info => {
            const row = document.createElement('div');
            row.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            `;
            row.innerHTML = `
                <span style="font-weight: 500;">${info.label}</span>
                <span style="
                    color: ${info.colorInfo.color};
                    font-weight: bold;
                    padding: 4px 8px;
                    border-radius: 4px;
                    background: ${info.colorInfo.background};
                ">${info.display}</span>
            `;
            content.appendChild(row);
        });

        popup.appendChild(header);
        popup.appendChild(content);
        document.body.appendChild(popup);

        // Close button — set dismissed flag so the MutationObserver never reopens it
        document.getElementById('close-popup').addEventListener('click', (e) => {
            e.stopPropagation();
            dismissed = true;
            popup.remove();
        });

        // Click outside to close — same dismissed logic
        document.addEventListener('click', function onOutsideClick(e) {
            if (!popup.contains(e.target)) {
                dismissed = true;
                popup.remove();
                document.removeEventListener('click', onOutsideClick);
            }
        });

        console.log('[ArgusPopup] Pop-in créé avec succès');
    }

    function waitForPageLoad() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(createPopup, 2000));
        } else {
            setTimeout(createPopup, 2000);
        }
    }

    // MutationObserver for dynamic page rendering — respects dismissed flag
    const observer = new MutationObserver(() => {
        if (!dismissed) {
            setTimeout(createPopup, 3000);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    waitForPageLoad();

})();
