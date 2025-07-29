🚗 Argus Tech Info Popup

Tampermonkey user script that displays a technical summary popup on Argus car spec pages, with color-coded performance data.

This userscript enhances the user experience on largus.fr by automatically extracting key technical specifications from car data sheets and presenting them in a clean, color-coded popup for quick evaluation.
✨ Features

    Automatically displays a popup panel on Argus technical pages with car specs such as:

        Length, weight, trunk capacity

        Real max power, top speed, acceleration

        Urban fuel consumption, wheel size, and architecture

    Color-coded values for quick visual benchmarking (green = strong, red = weak, etc.)

    Highlights architecture (e.g. "quatre cylindres") with a separate styling logic

    Fully non-intrusive and easy to dismiss (click outside or close icon)

    Works automatically on pages under https://www.largus.fr/fiche-technique/*

📊 Evaluation Logic

Each spec is evaluated using thresholds defined in the script. For example:

    A top speed above 200 km/h is green, between 190–200 is orange, and below is red.

    Reverse scoring is applied to acceleration and fuel consumption (lower is better).

    Architecture is scored by the number of cylinders.

🔧 Installation

    Install Tampermonkey (browser extension)

    Create a new script and paste the source code

    Visit any Argus fiche technique page and wait 2–3 seconds for the popup to appear

📦 Compatibility

    Designed for modern versions of largus.fr

    Dynamically adapts to changes in the page using a MutationObserver
