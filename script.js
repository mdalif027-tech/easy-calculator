/* =========================================================
   EASY CALCULATOR
   COMPLETE MERGED & UPGRADED SCRIPT
   ========================================================= */

/* =========================================================
   HAPTIC FEEDBACK HELPER
   ========================================================= */

function triggerHaptic() {
    const hapticsEnabled = localStorage.getItem("hapticsEnabled") !== "false";
    if (hapticsEnabled && navigator.vibrate) {
        navigator.vibrate(15);
    }
}


/* =========================================================
   BASIC ELEMENTS
   ========================================================= */

const numberButtons = document.querySelectorAll(".number");
const operatorButtons = document.querySelectorAll(".operator");
const result = document.getElementById("result");
const calculation = document.getElementById("calculation");
const equalsButton = document.querySelector(".equals");
const clearButton = document.querySelector(".clear");
const backspaceButton = document.querySelector(".backspace");
const signButton = document.querySelector(".sign");
const percentageButton = document.querySelector(".percentage");


/* =========================================================
   SETTINGS
   ========================================================= */

const settingsButton = document.getElementById("settingsButton");
const settingsOverlay = document.getElementById("settingsOverlay");
const closeSettings = document.getElementById("closeSettings");


/* =========================================================
   HISTORY
   ========================================================= */

const historyButton = document.getElementById("historyButton");
const historyOverlay = document.getElementById("historyOverlay");
const closeHistory = document.getElementById("closeHistory");
const historyList = document.getElementById("historyList");


/* =========================================================
   BACKGROUND & UI SETTINGS
   ========================================================= */

const backgroundImageInput = document.getElementById("backgroundImageInput");
const removeBackground = document.getElementById("removeBackground");
const compactButtonsToggle = document.getElementById("largeButtonsToggle") || document.getElementById("compactButtonsToggle");
const percentageProportional = document.getElementById("percentageProportional");
const percentageNumerical = document.getElementById("percentageNumerical");


/* =========================================================
   CALCULATOR STATE
   ========================================================= */

let expression = "";
let finalized = false;
let percentageMode = localStorage.getItem("percentageMode") || "proportional";

const operators = ["+", "−", "×", "÷", "^", "√"];


/* =========================================================
   EXPRESSION HELPERS & FORMATTING
   ========================================================= */

function isOperator(value) {
    return operators.includes(value);
}

function cleanExpression(value) {
    return value.replace(/\s/g, "");
}

function formatExpression(value) {
    return value
        .replaceAll("×", " × ")
        .replaceAll("÷", " ÷ ")
        .replaceAll("+", " + ")
        .replaceAll("−", " − ")
        .replaceAll("^", " ^ ")
        .replaceAll("√", " √ ")
        .replace(/\s+/g, " ")
        .trim();
}

function formatResult(value) {
    if (typeof value === "string") return value;
    if (!Number.isFinite(value)) return "Error";

    if (Math.abs(value) > 1e12 || (Math.abs(value) < 1e-6 && value !== 0)) {
        return value.toExponential(6);
    }

    const rounded = Math.round((value + Number.EPSILON) * 1e10) / 1e10;
    return String(rounded);
}

function factorial(n) {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
}


/* =========================================================
   ADVANCED SHUNTING-YARD PARSER & EVALUATOR (PEMDAS)
   ========================================================= */

function tokenize(str) {
    const tokens = [];
    let i = 0;

    while (i < str.length) {
        const char = str[i];

        if (/\d|\./.test(char)) {
            let num = "";
            while (i < str.length && (/\d|\./.test(str[i]))) {
                num += str[i];
                i++;
            }
            if (i < str.length && str[i] === "%") {
                num += "%";
                i++;
            }
            tokens.push(num);
            continue;
        }

        if (char === "π" || char === "e") {
            tokens.push(char);
            i++;
            continue;
        }

        if (isOperator(char) || char === "(" || char === ")" || char === "!") {
            tokens.push(char);
            i++;
            continue;
        }

        i++;
    }
    return tokens;
}

function evaluateExpression(input) {
    let raw = cleanExpression(input);
    if (!raw) return 0;

    while (raw.length > 0 && isOperator(raw.at(-1))) {
        raw = raw.slice(0, -1);
    }

    try {
        let tokens = tokenize(raw);
        if (tokens.length === 0) return 0;

        let processedTokens = [];
        for (let i = 0; i < tokens.length; i++) {
            let curr = tokens[i];
            let prev = tokens[i - 1];

            if (prev && (
                (!isNaN(prev) || prev.endsWith("%") || prev === ")" || prev === "π" || prev === "e") &&
                (!isNaN(curr) || curr === "(" || curr === "π" || curr === "e")
            )) {
                processedTokens.push("×");
            }
            processedTokens.push(curr);
        }

        const outputQueue = [];
        const operatorStack = [];
        const precedence = { "+": 1, "−": 1, "×": 2, "÷": 2, "^": 3, "√": 3 };
        const associativity = { "+": "L", "−": "L", "×": "L", "÷": "L", "^": "R", "√": "R" };

        for (let i = 0; i < processedTokens.length; i++) {
            let token = processedTokens[i];

            if (!isNaN(token) || token.endsWith("%") || token === "π" || token === "e") {
                outputQueue.push(token);
            } else if (token === "!") {
                outputQueue.push(token);
            } else if (isOperator(token)) {
                if (token === "−" && (i === 0 || processedTokens[i - 1] === "(" || isOperator(processedTokens[i - 1]))) {
                    outputQueue.push("0");
                }

                while (
                    operatorStack.length > 0 &&
                    operatorStack.at(-1) !== "(" &&
                    (
                        (associativity[token] === "L" && precedence[token] <= precedence[operatorStack.at(-1)]) ||
                        (associativity[token] === "R" && precedence[token] < precedence[operatorStack.at(-1)])
                    )
                ) {
                    outputQueue.push(operatorStack.pop());
                }
                operatorStack.push(token);
            } else if (token === "(") {
                operatorStack.push(token);
            } else if (token === ")") {
                while (operatorStack.length > 0 && operatorStack.at(-1) !== "(") {
                    outputQueue.push(operatorStack.pop());
                }
                operatorStack.pop();
            }
        }

        while (operatorStack.length > 0) {
            outputQueue.push(operatorStack.pop());
        }

        const stack = [];
        for (let token of outputQueue) {
            if (token === "π") {
                stack.push(Math.PI);
            } else if (token === "e") {
                stack.push(Math.E);
            } else if (token.endsWith("%")) {
                let val = Number(token.slice(0, -1));
                if (percentageMode === "proportional" && stack.length > 0) {
                    val = stack[stack.length - 1] * (val / 100);
                } else {
                    val = val / 100;
                }
                stack.push(val);
            } else if (!isNaN(token)) {
                stack.push(Number(token));
            } else if (token === "!") {
                let a = stack.pop();
                stack.push(factorial(a));
            } else if (isOperator(token)) {
                let b = stack.pop();
                let a = stack.length > 0 ? stack.pop() : 0;

                switch (token) {
                    case "+": stack.push(a + b); break;
                    case "−": stack.push(a - b); break;
                    case "×": stack.push(a * b); break;
                    case "÷":
                        if (b === 0) return "Cannot divide by 0";
                        stack.push(a / b);
                        break;
                    case "^": stack.push(Math.pow(a, b)); break;
                    case "√":
                        if (a === 0) return "Error";
                        stack.push(Math.pow(b, 1 / a));
                        break;
                }
            }
        }

        return stack.length === 1 ? stack[0] : null;
    } catch (e) {
        return null;
    }
}


/* =========================================================
   DISPLAY UPDATES & INPUT HANDLERS
   ========================================================= */

function updateDisplay() {
    calculation.textContent = formatExpression(expression);

    if (!expression) {
        result.textContent = "0";
        return;
    }

    const answer = evaluateExpression(expression);
    result.textContent = answer === null ? "0" : formatResult(answer);
}

numberButtons.forEach(button => {
    button.addEventListener("click", () => {
        triggerHaptic();
        const number = button.textContent.trim();

        if (finalized) {
            expression = "";
            finalized = false;
        }

        expression += number;
        updateDisplay();
    });
});

operatorButtons.forEach(button => {
    button.addEventListener("click", () => {
        triggerHaptic();
        const operator = button.dataset.operator;

        if (finalized) {
            expression = result.textContent;
            finalized = false;
        }

        if (!expression && operator === "−") {
            expression = "−";
            updateDisplay();
            return;
        }

        if (expression && isOperator(expression.at(-1))) {
            expression = expression.slice(0, -1) + operator;
        } else {
            expression += operator;
        }

        updateDisplay();
    });
});

percentageButton.addEventListener("click", () => {
    triggerHaptic();
    if (finalized) finalized = false;
    expression += "%";
    updateDisplay();
});

equalsButton.addEventListener("click", () => {
    triggerHaptic();
    if (!expression) return;

    const answer = evaluateExpression(expression);
    if (answer === null) return;

    const finalAnswer = formatResult(answer);
    if (finalAnswer === "Cannot divide by 0" || finalAnswer === "Error") {
        result.textContent = finalAnswer;
        return;
    }

    addHistory(formatExpression(expression), finalAnswer);
    calculation.textContent = formatExpression(expression) + " =";
    result.textContent = finalAnswer;
    expression = finalAnswer;
    finalized = true;
});

clearButton.addEventListener("click", () => {
    triggerHaptic();
    expression = "";
    finalized = false;
    calculation.textContent = "";
    result.textContent = "0";
});

backspaceButton.addEventListener("click", () => {
    triggerHaptic();
    if (finalized) {
        expression = "";
        finalized = false;
    } else {
        expression = expression.slice(0, -1);
    }
    updateDisplay();
});

signButton.addEventListener("click", () => {
    triggerHaptic();
    if (finalized) {
        expression = result.textContent;
        finalized = false;
    }

    if (expression.startsWith("−")) {
        expression = expression.substring(1);
    } else {
        expression = "−" + expression;
    }
    updateDisplay();
});


/* =========================================================
   SETTINGS OVERLAY & PREFERENCES
   ========================================================= */

settingsButton.addEventListener("click", () => {
    triggerHaptic();
    settingsOverlay.classList.add("active");
});

closeSettings.addEventListener("click", () => {
    triggerHaptic();
    settingsOverlay.classList.remove("active");
});

settingsOverlay.addEventListener("click", (e) => {
    if (e.target === settingsOverlay) settingsOverlay.classList.remove("active");
});

function updatePercentageSetting() {
    percentageProportional.checked = percentageMode === "proportional";
    percentageNumerical.checked = percentageMode === "numerical";
}

percentageProportional.addEventListener("change", () => {
    if (percentageProportional.checked) {
        percentageMode = "proportional";
        localStorage.setItem("percentageMode", "proportional");
        updateDisplay();
    }
});

percentageNumerical.addEventListener("change", () => {
    if (percentageNumerical.checked) {
        percentageMode = "numerical";
        localStorage.setItem("percentageMode", "numerical");
        updateDisplay();
    }
});

const themeButtons = document.querySelectorAll(".theme-option");
themeButtons.forEach(button => {
    button.addEventListener("click", () => {
        triggerHaptic();
        const theme = button.dataset.theme;

        if (theme === "custom") {
            backgroundImageInput.click();
            return;
        }

        document.body.style.backgroundImage = "";
        if (theme === "light") {
            document.body.removeAttribute("data-theme");
        } else {
            document.body.setAttribute("data-theme", theme);
        }
        localStorage.setItem("calculatorTheme", theme);
    });
});

backgroundImageInput.addEventListener("change", () => {
    const file = backgroundImageInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
        const image = reader.result;
        document.body.style.backgroundImage = `url("${image}")`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.removeAttribute("data-theme");

        localStorage.setItem("calculatorCustomBackground", image);
        localStorage.setItem("calculatorTheme", "custom");
    });
    reader.readAsDataURL(file);
});

removeBackground.addEventListener("click", () => {
    triggerHaptic();
    document.body.style.backgroundImage = "";
    document.body.removeAttribute("data-theme");
    localStorage.removeItem("calculatorCustomBackground");
    localStorage.setItem("calculatorTheme", "light");
});


/* =========================================================
   INTERACTIVE HISTORY MANAGEMENT
   ========================================================= */

let history = JSON.parse(localStorage.getItem("calculatorHistory") || "[]");

function addHistory(equation, answer) {
    history.unshift({ equation, answer });
    history = history.slice(0, 25);
    localStorage.setItem("calculatorHistory", JSON.stringify(history));
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderHistory() {
    if (history.length === 0) {
        historyList.innerHTML = '<p class="empty-history">No calculations yet.</p>';
        return;
    }

    historyList.innerHTML = history.map((item, index) => `
        <div class="history-item" data-index="${index}" style="cursor: pointer; padding: 8px; border-bottom: 1px solid rgba(0,0,0,0.05);">
            <div style="font-size: 0.9em; opacity: 0.7;">${escapeHtml(item.equation)}</div>
            <strong style="font-size: 1.1em;">= ${escapeHtml(item.answer)}</strong>
        </div>
    `).join("");

    document.querySelectorAll(".history-item").forEach(item => {
        item.addEventListener("click", () => {
            triggerHaptic();
            const idx = item.dataset.index;
            expression = history[idx].answer;
            finalized = false;
            updateDisplay();
            historyOverlay.classList.remove("active");
        });
    });
}

historyButton.addEventListener("click", () => {
    triggerHaptic();
    renderHistory();
    historyOverlay.classList.add("active");
});

closeHistory.addEventListener("click", () => {
    triggerHaptic();
    historyOverlay.classList.remove("active");
});

historyOverlay.addEventListener("click", (e) => {
    if (e.target === historyOverlay) historyOverlay.classList.remove("active");
});


/* =========================================================
   BUTTON SIZING & PREFERENCE INITIALIZATION (BIG BY DEFAULT)
   ========================================================= */

if (compactButtonsToggle) {
    compactButtonsToggle.addEventListener("change", () => {
        triggerHaptic();
        document.body.classList.toggle("compact-buttons", compactButtonsToggle.checked);
        localStorage.setItem("compactButtons", compactButtonsToggle.checked ? "true" : "false");
    });
}

const savedTheme = localStorage.getItem("calculatorTheme");
if (savedTheme === "dark" || savedTheme === "golden") {
    document.body.setAttribute("data-theme", savedTheme);
}

const savedBackground = localStorage.getItem("calculatorCustomBackground");
if (savedTheme === "custom" && savedBackground) {
    document.body.style.backgroundImage = `url("${savedBackground}")`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundRepeat = "no-repeat";
}

const savedCompactButtons = localStorage.getItem("compactButtons");
if (savedCompactButtons === "true") {
    if (compactButtonsToggle) compactButtonsToggle.checked = true;
    document.body.classList.add("compact-buttons");
}

updatePercentageSetting();


/* =========================================================
   INTEREST CALCULATOR LOGIC (DYNAMIC FORMULA STEPS)
   ========================================================= */

const interestModeButton = document.getElementById("interestModeButton");
const interestCalculator = document.getElementById("interestCalculator");
const interestBackButton = document.getElementById("interestBackButton");
const keypad = document.querySelector(".keypad");
const display = document.querySelector(".display");
const modes = document.querySelector(".modes");

const interestAmount = document.getElementById("interestAmount");
const interestRate = document.getElementById("interestRate");
const interestTime = document.getElementById("interestTime");
const interestTimeUnit = document.getElementById("interestTimeUnit");
const compoundFrequency = document.getElementById("compoundFrequency");
const compoundFrequencySelect = document.getElementById("compoundFrequencySelect");

const simpleInterestButton = document.getElementById("simpleInterestButton");
const compoundInterestButton = document.getElementById("compoundInterestButton");
const addInterestButton = document.getElementById("addInterestButton");
const subtractInterestButton = document.getElementById("subtractInterestButton");

const interestResult = document.getElementById("interestResult");
const interestFinalAmount = document.getElementById("interestFinalAmount");
const interestExplanation = document.getElementById("interestExplanation");

let interestType = "simple";
let interestDirection = 1;

const interestActions = document.querySelector(".interest-actions");
const interestClearButton = document.createElement("button");
interestClearButton.id = "interestClearButton";
interestClearButton.textContent = "Clear";
interestClearButton.type = "button";

if (interestActions) {
    interestActions.appendChild(interestClearButton);
}

function formatInterestNumber(value) {
    if (!Number.isFinite(value)) return "0";
    const rounded = Math.round((value + Number.EPSILON) * 100000008) / 100000008;
    return String(rounded);
}

function getInterestYears() {
    const time = Number(interestTime.value);
    if (!Number.isFinite(time) || time < 0) return 0;
    if (interestTimeUnit.value === "months") return time / 12;
    if (interestTimeUnit.value === "days") return time / 365;
    return time;
}

function calculateInterest() {
    const principal = Number(interestAmount.value);
    const rate = Number(interestRate.value);
    const years = getInterestYears();

    if (interestAmount.value === "" || interestRate.value === "" || interestTime.value === "") {
        interestResult.textContent = "0";
        interestFinalAmount.textContent = "0";
        interestExplanation.innerHTML = `
            <div class="formula-line"><strong>Simple Interest:</strong> Interest = (Principal × Rate × Time) ÷ 100</div>
          <div class="formula-line"><strong>Compound Interest:</strong> Amount = Principal × (1 + Rate ÷ 100)<sup>Time</sup></div>
        `;
        return;
    }

    if (!Number.isFinite(principal) || !Number.isFinite(rate) || !Number.isFinite(years)) {
        interestResult.textContent = "0";
        interestFinalAmount.textContent = "0";
        interestExplanation.innerHTML = `<div>Please enter valid numbers.</div>`;
        return;
    }

    let earnedInterest = 0;
    let finalAmount = principal;

    if (interestType === "simple") {
        earnedInterest = principal * (rate / 100) * years;
        finalAmount = principal + (interestDirection * earnedInterest);
        
        interestExplanation.innerHTML = `
            <div class="formula-line"><strong>Formula:</strong> Interest = (Principal × Rate × Time) ÷ 100</div>
            <div class="formula-line"><strong>Calculation:</strong> (${formatInterestNumber(principal)} × ${formatInterestNumber(rate)} × ${formatInterestNumber(years)}) ÷ 100 = ${formatInterestNumber(earnedInterest)}</div>
            <div><strong>Total Balance:</strong> ${formatInterestNumber(finalAmount)}</div>
        `;
    } else {
        const frequency = Number(compoundFrequencySelect.value);
        const periodicRate = rate / 100 / frequency;
        const periods = frequency * years;
        const amountAfterGrowth = principal * Math.pow(1 + periodicRate, periods);

        earnedInterest = amountAfterGrowth - principal;
        finalAmount = principal + (interestDirection * earnedInterest);

        interestExplanation.innerHTML = `
            <div class="formula-line"><strong>Formula:</strong> Total = Principal × (1 + Rate ÷ Frequency)^(Periods)</div>
            <div class="formula-line"><strong>Calculation:</strong> ${formatInterestNumber(principal)} × (1 + ${formatInterestNumber(rate / 100)} ÷ ${frequency})^${formatInterestNumber(periods)} = ${formatInterestNumber(amountAfterGrowth)}</div>
            <div><strong>Earned Interest:</strong> ${formatInterestNumber(earnedInterest)}</div>
        `;
    }

    interestResult.textContent = formatInterestNumber(earnedInterest);
    interestFinalAmount.textContent = formatInterestNumber(finalAmount);
}

simpleInterestButton.addEventListener("click", function() {
    triggerHaptic();
    interestType = "simple";
    simpleInterestButton.classList.add("active");
    compoundInterestButton.classList.remove("active");
    compoundFrequency.classList.remove("active");
    calculateInterest();
});

compoundInterestButton.addEventListener("click", function() {
    triggerHaptic();
    interestType = "compound";
    compoundInterestButton.classList.add("active");
    simpleInterestButton.classList.remove("active");
    compoundFrequency.classList.add("active");
    calculateInterest();
});

addInterestButton.addEventListener("click", function() {
    triggerHaptic();
    interestDirection = 1;
    addInterestButton.classList.add("active");
    subtractInterestButton.classList.remove("active");
    calculateInterest();
});

subtractInterestButton.addEventListener("click", function() {
    triggerHaptic();
    interestDirection = -1;
    subtractInterestButton.classList.add("active");
    addInterestButton.classList.remove("active");
    calculateInterest();
});

interestClearButton.addEventListener("click", function() {
    triggerHaptic();
    interestAmount.value = "";
    interestRate.value = "";
    interestTime.value = "";
    interestResult.textContent = "0";
    interestFinalAmount.textContent = "0";
    calculateInterest();
    interestAmount.focus();
});

[interestAmount, interestRate, interestTime, interestTimeUnit, compoundFrequencySelect].forEach(function(element) {
    element.addEventListener("input", calculateInterest);
    element.addEventListener("change", calculateInterest);
});

interestModeButton.addEventListener("click", function() {
    triggerHaptic();
    display.style.display = "none";
    keypad.style.display = "none";
    modes.style.display = "none";

    scientificCalculator.classList.remove("active");
    scientificBackButton.hidden = true;
    othersCalculator.classList.remove("active");
    othersBackButton.hidden = true;
    saleCalculator.classList.remove("active");
    saleBackButton.hidden = true;

    interestCalculator.classList.add("active");
    interestBackButton.hidden = false;
    calculateInterest();
});

interestBackButton.addEventListener("click", function() {
    triggerHaptic();
    interestCalculator.classList.remove("active");
    display.style.display = "";
    keypad.style.display = "";
    modes.style.display = "";
    interestBackButton.hidden = true;
});


/* =========================================================
   OTHERS CALCULATOR (CONVERSION, BMI, AGE)
   ========================================================= */

const othersModeButton = document.getElementById("othersModeButton");
const othersCalculator = document.getElementById("othersCalculator");
const othersBackButton = document.getElementById("othersBackButton");

const othersSubConversion = document.getElementById("othersSubConversion");
const othersSubBMI = document.getElementById("othersSubBMI");
const othersSubAge = document.getElementById("othersSubAge");

const subSectionConversion = document.getElementById("subSectionConversion");
const subSectionBMI = document.getElementById("subSectionBMI");
const subSectionAge = document.getElementById("subSectionAge");

othersSubConversion.addEventListener("click", function() {
    triggerHaptic();
    othersSubConversion.classList.add("active");
    othersSubBMI.classList.remove("active");
    othersSubAge.classList.remove("active");

    subSectionConversion.style.display = "block";
    subSectionBMI.style.display = "none";
    subSectionAge.style.display = "none";
});

othersSubBMI.addEventListener("click", function() {
    triggerHaptic();
    othersSubBMI.classList.add("active");
    othersSubConversion.classList.remove("active");
    othersSubAge.classList.remove("active");

    subSectionConversion.style.display = "none";
    subSectionBMI.style.display = "block";
    subSectionAge.style.display = "none";
});

othersSubAge.addEventListener("click", function() {
    triggerHaptic();
    othersSubAge.classList.add("active");
    othersSubConversion.classList.remove("active");
    othersSubBMI.classList.remove("active");

    subSectionConversion.style.display = "none";
    subSectionBMI.style.display = "none";
    subSectionAge.style.display = "block";
});

const conversionCategory = document.getElementById("conversionCategory");
const conversionAmount = document.getElementById("conversionAmount");
const conversionFromUnit = document.getElementById("conversionFromUnit");
const conversionToUnit = document.getElementById("conversionToUnit");
const conversionFinalResult = document.getElementById("conversionFinalResult");
const conversionExplanation = document.getElementById("conversionExplanation");

const units = {
    length: [
        { id: "meters", name: "Meters", rate: 1 },
        { id: "feet", name: "Feet", rate: 3.28084 },
        { id: "inches", name: "Inches", rate: 39.3701 },
        { id: "centimeters", name: "Centimeters", rate: 100 }
    ],
    weight: [
        { id: "kilograms", name: "Kilograms", rate: 1 },
        { id: "pounds", name: "Pounds", rate: 2.20462 },
        { id: "ounces", name: "Ounces", rate: 35.274 },
        { id: "grams", name: "Grams", rate: 1000 }
    ],
    temperature: [
        { id: "celsius", name: "Celsius" },
        { id: "fahrenheit", name: "Fahrenheit" },
        { id: "kelvin", name: "Kelvin" }
    ]
};

function updateConversionDropdowns() {
    const category = conversionCategory.value;
    const currentUnits = units[category];
    let optionsHTML = "";

    currentUnits.forEach(function(unit) {
        optionsHTML += `<option value="${unit.id}">${unit.name}</option>`;
    });

    conversionFromUnit.innerHTML = optionsHTML;
    conversionToUnit.innerHTML = optionsHTML;

    if (currentUnits.length > 1) {
        conversionToUnit.selectedIndex = 1;
    }

    calculateConversion();
}

function calculateConversion() {
    const amount = Number(conversionAmount.value);
    const category = conversionCategory.value;
    const from = conversionFromUnit.value;
    const to = conversionToUnit.value;

    if (conversionAmount.value === "" || !Number.isFinite(amount)) {
        conversionFinalResult.textContent = "0";
        conversionExplanation.innerHTML = `<div>Enter an amount to convert.</div>`;
        return;
    }

    let resultVal = 0;

    if (category === "temperature") {
        let tempInCelsius = amount;

        if (from === "fahrenheit") tempInCelsius = (amount - 32) * 5/9;
        else if (from === "kelvin") tempInCelsius = amount - 273.15;

        if (to === "celsius") resultVal = tempInCelsius;
        else if (to === "fahrenheit") resultVal = (tempInCelsius * 9/5) + 32;
        else if (to === "kelvin") resultVal = tempInCelsius + 273.15;
    } else {
        const categoryData = units[category];
        const fromRate = categoryData.find(u => u.id === from).rate;
        const toRate = categoryData.find(u => u.id === to).rate;

        const baseAmount = amount / fromRate;
        resultVal = baseAmount * toRate;
    }

    const formattedResult = Math.round((resultVal + Number.EPSILON) * 10000) / 10000;
    conversionFinalResult.textContent = formattedResult;
    conversionExplanation.innerHTML = `
        <div class="formula-line"><strong>Conversion:</strong> ${amount} ${from} = ${formattedResult} ${to}</div>
    `;
}

conversionCategory.addEventListener("change", updateConversionDropdowns);
conversionAmount.addEventListener("input", calculateConversion);
conversionFromUnit.addEventListener("change", calculateConversion);
conversionToUnit.addEventListener("change", calculateConversion);

const bmiWeight = document.getElementById("bmiWeight");
const bmiHeight = document.getElementById("bmiHeight");
const bmiResultVal = document.getElementById("bmiResultVal");
const bmiCategoryVal = document.getElementById("bmiCategoryVal");

function calculateBMI() {
    const weight = Number(bmiWeight.value);
    const heightCm = Number(bmiHeight.value);

    if (!weight || !heightCm || weight <= 0 || heightCm <= 0) {
        bmiResultVal.textContent = "0";
        bmiCategoryVal.textContent = "-";
        return;
    }

    const heightM = heightCm / 100;
    const bmi = weight / (heightM * heightM);
    const roundedBmi = Math.round((bmi + Number.EPSILON) * 10) / 10;

    bmiResultVal.textContent = roundedBmi;

    if (roundedBmi < 18.5) bmiCategoryVal.textContent = "Underweight";
    else if (roundedBmi < 25) bmiCategoryVal.textContent = "Normal weight";
    else if (roundedBmi < 30) bmiCategoryVal.textContent = "Overweight";
    else bmiCategoryVal.textContent = "Obese";
}

bmiWeight.addEventListener("input", calculateBMI);
bmiHeight.addEventListener("input", calculateBMI);

const ageDob = document.getElementById("ageDob");
const ageFinalResult = document.getElementById("ageFinalResult");

function calculateAge() {
    if (!ageDob.value) {
        ageFinalResult.textContent = "0 Years";
        return;
    }

    const birthDate = new Date(ageDob.value);
    const today = new Date();

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
        months--;
        const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        days += prevMonth.getDate();
    }

    if (months < 0) {
        years--;
        months += 12;
    }

    ageFinalResult.textContent = `${years} yrs, ${months} mos, ${days} days`;
}

ageDob.addEventListener("change", calculateAge);

othersModeButton.addEventListener("click", function() {
    triggerHaptic();
    display.style.display = "none";
    keypad.style.display = "none";
    modes.style.display = "none";

    interestCalculator.classList.remove("active");
    interestBackButton.hidden = true;
    scientificCalculator.classList.remove("active");
    scientificBackButton.hidden = true;
    saleCalculator.classList.remove("active");
    saleBackButton.hidden = true;

    othersCalculator.classList.add("active");
    othersBackButton.hidden = false;

    updateConversionDropdowns();
});

othersBackButton.addEventListener("click", function() {
    triggerHaptic();
    othersCalculator.classList.remove("active");
    othersBackButton.hidden = true;

    display.style.display = "";
    keypad.style.display = "";
    modes.style.display = "";
});


/* =========================================================
   SALE CALCULATOR LOGIC (DYNAMIC FORMULA STEPS)
   ========================================================= */

const saleModeButton = document.getElementById("saleModeButton");
const saleCalculator = document.getElementById("saleCalculator");
const saleBackButton = document.getElementById("saleBackButton");

const saleOriginalPrice = document.getElementById("saleOriginalPrice");
const saleDiscountRate = document.getElementById("saleDiscountRate");
const saleYouSave = document.getElementById("saleYouSave");
const saleFinalPrice = document.getElementById("saleFinalPrice");
const saleExplanation = document.getElementById("saleExplanation");
const shareSaleButton = document.getElementById("shareSaleButton");

function formatSaleNumber(value) {
    if (!Number.isFinite(value)) return "0";
    const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
    return String(rounded);
}

function calculateSale() {
    const price = Number(saleOriginalPrice.value);
    const discount = Number(saleDiscountRate.value);

    if (saleOriginalPrice.value === "" || !Number.isFinite(price)) {
        saleYouSave.textContent = "0";
        saleFinalPrice.textContent = "0";
        saleExplanation.innerHTML = `
            <div class="formula-line"><strong>Formula:</strong> Original Price - Discount % = Final Price</div>
            <div>Enter an original price to calculate.</div>
        `;
        return;
    }

    const discountPercent = Number.isFinite(discount) ? discount : 0;
    const savings = price * (discountPercent / 100);
    const final = price - savings;

    saleYouSave.textContent = formatSaleNumber(savings);
    saleFinalPrice.textContent = formatSaleNumber(final);
    
    saleExplanation.innerHTML = `
        <div class="formula-line"><strong>Formula:</strong> Original Price - Discount Amount = Final Price</div>
        <div class="formula-line"><strong>Calculation:</strong> ${formatSaleNumber(price)} - (${formatSaleNumber(price)} × ${formatSaleNumber(discountPercent / 100)}) = ${formatSaleNumber(final)}</div>
        <div><strong>You Save:</strong> ${formatSaleNumber(savings)}</div>
    `;
}

[saleOriginalPrice, saleDiscountRate].forEach(function(element) {
    element.addEventListener("input", calculateSale);
    element.addEventListener("change", calculateSale);
});

shareSaleButton.addEventListener("click", function() {
    triggerHaptic();
    const text = `Sale Breakdown:\nOriginal Price: ${saleOriginalPrice.value || 0}\nDiscount: ${saleDiscountRate.value || 0}%\nYou Save: ${saleYouSave.textContent}\nFinal Price: ${saleFinalPrice.textContent}`;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() {
            shareSaleButton.textContent = "✅ Copied Breakdown to Clipboard!";
            setTimeout(() => { shareSaleButton.textContent = "📤 Share Sale Breakdown"; }, 2000);
        });
    }
});


/* =========================================================
   SHARE INTEREST BREAKDOWN
   ========================================================= */

const shareInterestButton = document.getElementById("shareInterestButton");

shareInterestButton.addEventListener("click", function() {
    triggerHaptic();
    const text = `Interest Breakdown (${interestType.toUpperCase()}):\nPrincipal: ${interestAmount.value || 0}\nRate: ${interestRate.value || 0}%\nTime: ${interestTime.value || 0} ${interestTimeUnit.value}\nInterest Earned: ${interestResult.textContent}\nFinal Amount: ${interestFinalAmount.textContent}`;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() {
            shareInterestButton.textContent = "✅ Copied Breakdown to Clipboard!";
            setTimeout(() => { shareInterestButton.textContent = "📤 Share Interest Breakdown"; }, 2000);
        });
    }
});

saleModeButton.addEventListener("click", function() {
    triggerHaptic();
    display.style.display = "none";
    keypad.style.display = "none";
    modes.style.display = "none";

    interestCalculator.classList.remove("active");
    interestBackButton.hidden = true;
    othersCalculator.classList.remove("active");
    othersBackButton.hidden = true;
    scientificCalculator.classList.remove("active");
    scientificBackButton.hidden = true;

    saleCalculator.classList.add("active");
    saleBackButton.hidden = false;
    calculateSale();
});

saleBackButton.addEventListener("click", function() {
    triggerHaptic();
    saleCalculator.classList.remove("active");
    saleBackButton.hidden = true;

    display.style.display = "";
    keypad.style.display = "";
    modes.style.display = "";
});


/* =========================================================
   SCIENTIFIC CALCULATOR CONTROLS
   ========================================================= */

const scientificModeButton = document.getElementById("scientificModeButton");
const scientificCalculator = document.getElementById("scientificCalculator");
const scientificBackButton = document.getElementById("scientificBackButton");

scientificModeButton.addEventListener("click", function() {
    triggerHaptic();
    display.style.display = "";
    keypad.style.display = "";
    modes.style.display = "none";

    interestCalculator.classList.remove("active");
    interestBackButton.hidden = true;
    othersCalculator.classList.remove("active");
    othersBackButton.hidden = true;
    saleCalculator.classList.remove("active");
    saleBackButton.hidden = true;

    scientificCalculator.classList.add("active");
    scientificBackButton.hidden = false;
});

scientificBackButton.addEventListener("click", function() {
    triggerHaptic();
    scientificCalculator.classList.remove("active");
    scientificBackButton.hidden = true;

    display.style.display = "";
    keypad.style.display = "";
    modes.style.display = "";
});

const sciButtons = document.querySelectorAll(".sci-btn");

sciButtons.forEach(function(button) {
    button.addEventListener("click", function() {
        triggerHaptic();
        const action = button.dataset.action;
        let currentValue = Number(result.textContent);

        if (action === "powY") {
            if (finalized) { expression = result.textContent; finalized = false; }
            expression += "^";
            updateDisplay();
            return;
        }

        if (action === "rootY") {
            if (finalized) { expression = result.textContent; finalized = false; }
            expression += "√";
            updateDisplay();
            return;
        }

        let computedValue = currentValue;
        let displayExpression = "";

        switch (action) {
            case "sqrt":
                computedValue = Math.sqrt(currentValue);
                displayExpression = `√(${currentValue})`;
                break;
            case "pow":
                computedValue = Math.pow(currentValue, 2);
                displayExpression = `${currentValue}²`;
                break;
            case "sin":
                computedValue = Math.sin(currentValue * Math.PI / 180);
                displayExpression = `sin(${currentValue})`;
                break;
            case "cos":
                computedValue = Math.cos(currentValue * Math.PI / 180);
                displayExpression = `cos(${currentValue})`;
                break;
            case "tan":
                computedValue = Math.tan(currentValue * Math.PI / 180);
                displayExpression = `tan(${currentValue})`;
                break;
            case "ln":
                computedValue = Math.log(currentValue);
                displayExpression = `ln(${currentValue})`;
                break;
            case "log":
                computedValue = Math.log10(currentValue);
                displayExpression = `log(${currentValue})`;
                break;
            case "fact":
                computedValue = factorial(currentValue);
                displayExpression = `${currentValue}!`;
                break;
            case "pi":
                expression += "π";
                updateDisplay();
                return;
            case "e":
                expression += "e";
                updateDisplay();
                return;
        }

        calculation.textContent = displayExpression;
        result.textContent = formatResult(computedValue);
        expression = String(computedValue);
        finalized = true;
    });
});


/* =========================================================
   VOICE INPUT (DYNAMIC LANGUAGE & BANGLA CONVERSION)
   ========================================================= */

const micButton = document.getElementById("micButton");
const voiceLangSelect = document.getElementById("voiceLangSelect");
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition && micButton) {
    const recognition = new SpeechRecognition();
    recognition.lang = localStorage.getItem("voiceLang") || "en-US";

    if (voiceLangSelect) {
        voiceLangSelect.value = recognition.lang;
        voiceLangSelect.addEventListener("change", function () {
            recognition.lang = voiceLangSelect.value;
            localStorage.setItem("voiceLang", voiceLangSelect.value);
        });
    }

    recognition.continuous = false;
    let isListening = false;

    micButton.addEventListener("click", function() {
        triggerHaptic();
        if (!isListening) {
            micButton.style.opacity = "0.5";
            try {
                recognition.start();
                isListening = true;
            } catch (err) {
                console.log("Recognition start error:", err);
            }
        }
    });

    recognition.onresult = function(event) {
        micButton.style.opacity = "1";
        isListening = false;

        let transcript = event.results[0][0].transcript.toLowerCase();

        const bnNums = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
        transcript = transcript.replace(/[০-৯]/g, s => bnNums[s]);

        transcript = transcript
            .replace(/\b(যোগ|প্লাস)\b/g, "+")
            .replace(/\b(বিয়োগ|মাইনাস)\b/g, "−")
            .replace(/\b(গুণ)\b/g, "×")
            .replace(/\b(ভাগ)\b/g, "÷");

        transcript = transcript
            .replaceAll("-", "−")
            .replaceAll("/", "÷")
            .replaceAll("*", "×");

        transcript = transcript
            .replace(/\b(plus|and|add)\b/g, "+")
            .replace(/\b(minus|subtract|take away|less|dash)\b/g, "−")
            .replace(/\b(times|multiplied by|multiply by|multiplied|x)\b/g, "×")
            .replace(/\b(divided by|divide by|divided|divide|division|over|by)\b/g, "÷");

        expression = cleanExpression(transcript);
        finalized = false;

        updateDisplay();
        equalsButton.click();
    };

    recognition.onerror = function() {
        micButton.style.opacity = "1";
        isListening = false;
    };

    recognition.onend = function() {
        micButton.style.opacity = "1";
        isListening = false;
    };
} else if (micButton) {
    micButton.style.display = "none";
}


/* =========================================================
   GLOBAL APP SHARE OPTION (SETTINGS)
   ========================================================= */

const shareAppSettingButton = document.getElementById("shareAppSettingButton");

if (shareAppSettingButton) {
    shareAppSettingButton.addEventListener("click", function() {
        triggerHaptic();
        const shareData = {
            title: "Easy Calculator",
            text: "Check out this awesome and lightweight Easy Calculator app with built-in scientific, interest, and unit converters!",
            url: window.location.href
        };

        if (navigator.share) {
            navigator.share(shareData).catch(function(err) {
                console.log("Error sharing:", err);
            });
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(shareData.text + " " + shareData.url).then(function() {
                shareAppSettingButton.textContent = "✅ App Link Copied to Clipboard!";
                setTimeout(() => {
                    shareAppSettingButton.textContent = "📤 Share Easy Calculator App";
                }, 2000);
            });
        }
    });
}

const hapticsToggle = document.getElementById("hapticsToggle");

if (hapticsToggle) {
    const savedHaptics = localStorage.getItem("hapticsEnabled");
    if (savedHaptics === "false") {
        hapticsToggle.checked = false;
    } else {
        hapticsToggle.checked = true;
    }

    hapticsToggle.addEventListener("change", function() {
        triggerHaptic();
        localStorage.setItem("hapticsEnabled", hapticsToggle.checked ? "true" : "false");
    });
}

const adBanner = document.querySelector(".app-ad-banner");
if (localStorage.getItem("noAdsPurchased") === "true" && adBanner) {
    adBanner.style.display = "none";
}

const removeAdsButton = document.getElementById("removeAdsButton");
if (removeAdsButton) {
    removeAdsButton.addEventListener("click", function() {
        triggerHaptic();
        let confirmed = confirm("Would you like to purchase permanent No-Ads for $1.99?");

        if (confirmed) {
            localStorage.setItem("noAdsPurchased", "true");
            if (adBanner) adBanner.style.display = "none";
            removeAdsButton.textContent = "✅ Ad-Free Active!";
            removeAdsButton.style.pointerEvents = "none";
        }
    });
}


/* =========================================================
   DESKTOP KEYBOARD SUPPORT
   ========================================================= */

window.addEventListener("keydown", function(event) {
    if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) {
        return;
    }

    const key = event.key;

    if (!isNaN(key) || key === ".") {
        const btn = Array.from(numberButtons).find(b => b.textContent.trim() === key);
        if (btn) btn.click();
    } else if (key === "+") {
        const btn = Array.from(operatorButtons).find(b => b.dataset.operator === "+");
        if (btn) btn.click();
    } else if (key === "-") {
        const btn = Array.from(operatorButtons).find(b => b.dataset.operator === "−");
        if (btn) btn.click();
    } else if (key === "*") {
        const btn = Array.from(operatorButtons).find(b => b.dataset.operator === "×");
        if (btn) btn.click();
    } else if (key === "/") {
        event.preventDefault();
        const btn = Array.from(operatorButtons).find(b => b.dataset.operator === "÷");
        if (btn) btn.click();
    } else if (key === "(" || key === ")") {
        expression += key;
        updateDisplay();
    } else if (key === "Enter" || key === "=") {
        equalsButton.click();
    } else if (key === "Backspace") {
        backspaceButton.click();
    } else if (key === "Escape") {
        clearButton.click();
    } else if (key === "%") {
        percentageButton.click();
    }
});


/* =========================================================
   BRACKET BUTTON LISTENERS
   ========================================================= */

const bracketButtons = document.querySelectorAll(".bracket");

bracketButtons.forEach(button => {
    button.addEventListener("click", () => {
        triggerHaptic();
        const bracket = button.dataset.bracket || button.textContent.trim();

        if (finalized) {
            expression = "";
            finalized = false;
        }

        expression += bracket;
        updateDisplay();
    });
});
