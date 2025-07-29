// ==UserScript==
// @name         Argus Tech Info Popup
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Affiche un pop-in avec les informations techniques colorées sur l'Argus, y compris la puissance réelle maxi
// @author       You
// @match        https://www.largus.fr/fiche-technique/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=largus.fr
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const criteria = {
        longueur: [4.20, 4.40, 4.50],
        reservoir: [60, 50, 40],
        poids: [1250, 1400, 1500],
        coffre: [450, 400, 350],
        coffreUtile: [1300, 1100, 950],
        roues: [18, 16, 15],
        vitesseMax: [200, 190, 180],
        acceleration: [8, 9, 10],
        urbain: [6, 7, 8],
        puissance: [150, 120, 90]
    };

    function parseNumericValue(value) {
        if (!value || value === 'N/A') return null;
        const cleaned = value.toString().replace(/[^\d,.-]/g, '');
        const normalized = cleaned.replace(',', '.');
        const num = parseFloat(normalized);
        return isNaN(num) ? null : num;
    }

    function getColor(value, criteriaArray, isReverse = false) {
        const numValue = parseNumericValue(value);
        if (numValue === null) return { color: '#999999', background: '#99999920' };
        const [first, second, third] = criteriaArray;
        if (isReverse) {
            if (numValue <= first) return { color: '#4CAF50', background: '#4CAF5020' };
            if (numValue <= second) return { color: '#FF9800', background: '#FF980020' };
            if (numValue <= third) return { color: '#f44336', background: '#f4433620' };
            return { color: '#ffffff', background: '#000000' };
        } else {
            if (numValue >= first) return { color: '#4CAF50', background: '#4CAF5020' };
            if (numValue >= second) return { color: '#FF9800', background: '#FF980020' };
            if (numValue >= third) return { color: '#f44336', background: '#f4433620' };
            return { color: '#ffffff', background: '#000000' };
        }
    }

    function getArchitectureColor(value) {
        if (!value || value === 'N/A') return { color: '#999999', background: '#99999920' };
        const cylinderMatch = value.toString().toLowerCase().match(/(\w+)\s+cylindre/);
        if (!cylinderMatch) return { color: '#999999', background: '#99999920' };
        const cylinderWord = cylinderMatch[1];
        const numberWords = {
            'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4,
            'cinq': 5, 'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10
        };
        const cylinderCount = numberWords[cylinderWord] || 0;
        return cylinderCount < 4
            ? { color: '#ffffff', background: '#000000' }
            : { color: '#4CAF50', background: '#4CAF5020' };
    }

    function extractValue(searchTerms, isWeight = false, isVolume = false, isWheel = false) {
        for (let term of searchTerms) {
            const labelElements = document.querySelectorAll('.labelInfo');
            for (let labelElement of labelElements) {
                const labelText = labelElement.textContent || labelElement.innerText || '';
                if (labelText.toLowerCase().includes(term.toLowerCase())) {
                    let valueElement = labelElement.nextElementSibling;
                    if (!valueElement || !valueElement.classList.contains('valeur')) {
                        const parent = labelElement.parentElement;
                        if (parent) valueElement = parent.querySelector('.valeur');
                    }
                    if (!valueElement || !valueElement.classList.contains('valeur')) {
                        let currentElement = labelElement;
                        while (currentElement.nextElementSibling) {
                            currentElement = currentElement.nextElementSibling;
                            if (currentElement.classList.contains('valeur')) {
                                valueElement = currentElement;
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
        for (let term of searchTerms) {
            const labelElements = document.querySelectorAll('.labelInfo');
            for (let labelElement of labelElements) {
                const labelText = labelElement.textContent || labelElement.innerText || '';
                if (labelText.toLowerCase().includes(term.toLowerCase())) {
                    let valueElement = labelElement.nextElementSibling;
                    if (!valueElement || !valueElement.classList.contains('valeur')) {
                        const parent = labelElement.parentElement;
                        if (parent) valueElement = parent.querySelector('.valeur');
                    }
                    if (!valueElement || !valueElement.classList.contains('valeur')) {
                        let currentElement = labelElement;
                        while (currentElement.nextElementSibling) {
                            currentElement = currentElement.nextElementSibling;
                            if (currentElement.classList.contains('valeur')) {
                                valueElement = currentElement;
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
        if (document.getElementById('argus-popup')) return;

        const data = {
            longueur: extractValue(['longueur']),
            reservoir: extractValue(['réservoir']),
            poids: extractValue(['poids à vide'], true),
            coffre: extractValue(['volume de coffre'], false, true),
            coffreUtile: extractValue(['volume de coffre utile'], false, true),
            roues: extractValue(['taille des roues avant'], false, false, true),
            puissance: extractValue(['puissance réelle maxi']),
            vitesseMax: extractValue(['vitesse maximale']),
            acceleration: extractValue(['0 à 100 km/h']),
            urbain: extractValue(['cycle urbain']),
            architecture: extractArchitecture(['architecture'])
        };

        console.log('Valeurs extraites:', data);

        const popup = document.createElement('div');
        popup.id = 'argus-popup';
        popup.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 350px;
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
            <span>Informations Techniques</span>
            <span id="close-popup" style="cursor: pointer; font-size: 18px;">&times;</span>
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            padding: 15px;
            max-height: 600px;
            overflow-y: auto;
        `;

        const infos = [
            { label: 'Longueur', value: data.longueur, criteria: criteria.longueur, unit: 'm', reverse: true },
            { label: 'Réservoir', value: data.reservoir, criteria: criteria.reservoir, unit: 'L', reverse: false },
            { label: 'Poids à vide', value: data.poids, criteria: criteria.poids, unit: 'kg', reverse: true },
            { label: 'Volume de coffre', value: data.coffre, criteria: criteria.coffre, unit: 'L', reverse: false },
            { label: 'Volume de coffre utile', value: data.coffreUtile, criteria: criteria.coffreUtile, unit: 'L', reverse: false },
            { label: 'Taille des roues avant', value: data.roues, criteria: criteria.roues, unit: '"', reverse: false },
            { label: 'Puissance réelle maxi', value: data.puissance, criteria: criteria.puissance, unit: 'ch', reverse: false },
            { label: 'Vitesse maximale', value: data.vitesseMax, criteria: criteria.vitesseMax, unit: 'km/h', reverse: false },
            { label: '0 à 100 km/h', value: data.acceleration, criteria: criteria.acceleration, unit: 's', reverse: true },
            { label: 'Cycle urbain', value: data.urbain, criteria: criteria.urbain, unit: 'L/100km', reverse: true },
            { label: 'Architecture', value: data.architecture, isArchitecture: true }
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

            let colorInfo;
            let displayValue;

            if (info.isArchitecture) {
                colorInfo = getArchitectureColor(info.value);
                displayValue = info.value;
            } else {
                colorInfo = getColor(info.value, info.criteria, info.reverse);
                displayValue = info.value !== 'N/A' ? info.value + ' ' + info.unit : info.value;
            }

            row.innerHTML = `
                <span style="font-weight: 500;">${info.label}</span>
                <span style="
                    color: ${colorInfo.color};
                    font-weight: bold;
                    padding: 4px 8px;
                    border-radius: 4px;
                    background: ${colorInfo.background};
                ">${displayValue}</span>
            `;
            content.appendChild(row);
        });

        popup.appendChild(header);
        popup.appendChild(content);
        document.body.appendChild(popup);

        document.getElementById('close-popup').addEventListener('click', () => {
            popup.remove();
        });

        document.addEventListener('click', function(e) {
            if (!popup.contains(e.target)) {
                popup.remove();
            }
        });

        console.log('Pop-in Argus créé avec succès');
    }

    function waitForPageLoad() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(createPopup, 2000);
            });
        } else {
            setTimeout(createPopup, 2000);
        }
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                setTimeout(createPopup, 3000);
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    waitForPageLoad();

})();
