/* =========================================================
   EASY CALCULATOR
   UPGRADED SCRIPT - MOBILE TOUCH & CURSOR FIXES
   ========================================================= */

function triggerHaptic() {
    const hapticsEnabled = localStorage.getItem("hapticsEnabled") !== "false";
    if (hapticsEnabled && navigator.vibrate) {
        navigator.vibrate(15);
    }
}

/* BASIC ELEMENTS */
const numberButtons = document.querySelectorAll(".number");
const operatorButtons = document.querySelectorAll(".operator");
const result = document.getElementById("result");
const calculation = document.getElementById("calculation");
const equalsButton = document.querySelector(".equals");
const clearButton = document.querySelector(".clear");
const backspaceButton = document.querySelector(".backspace");
const signButton = document.querySelector(".sign");
const percentageButton = document.querySelector(".percentage");

/* SETTINGS & OVERLAYS */
const settingsButton = document.getElementById("settingsButton");
const settingsOverlay = document.getElementById("settingsOverlay");
const closeSettings = document.getElementById("closeSettings");

const historyButton = document.getElementById("historyButton");
const historyOverlay = document.getElementById("historyOverlay");
const closeHistory = document.getElementById("closeHistory");
const historyList = document.getElementById("historyList");

const backgroundImageInput = document.getElementById("backgroundImageInput");
const removeBackground = document.getElementById("removeBackground");
const compactButtonsToggle = document.getElementById("largeButtonsToggle") || document.getElementById("compactButtonsToggle");
const percentageProportional = document.getElementById("percentageProportional");
const percentageNumerical = document.getElementById("percentageNumerical");

/* CALCULATOR STATE */
let expression = "";
let finalized = false;
let percentageMode = localStorage.getItem("percentageMode") || "proportional";
let isDegreeMode = true;

const operators = ["+", "−", "-", "×", "*", "÷", "/", "^", "√"];

function isOperator(value) { return operators.includes(value); }

function cleanExpression(value) { 
    if (!value) return "";
    return value
        .replace(/\s/g, "")
        .replaceAll("-", "−")
        .replaceAll("*", "×")
        .replaceAll("/", "÷"); 
}

function formatExpression(value) {
    return value ? value.trim() : "";
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
   SAFE MOBILE TOUCH / CLICK EVENT BINDER
   ========================================================= */
function bindFastClick(element, callback) {
    if (!element) return;
    
    let touchHandled = false;

    element.addEventListener("touchstart", function (e) {
        touchHandled = true;
        if (e.cancelable) {
            e.preventDefault();
        }
        callback(e);
    }, { passive: false });

    element.addEventListener("click", function (e) {
        if (touchHandled) {
            touchHandled = false;
            return;
        }
        callback(e);
    });
}

/* =========================================================
   CURSOR & SELECTION MANAGEMENT
   ========================================================= */
let savedSelection = { start: 0, end: 0 };

function saveCaretPosition() {
    if (!calculation) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (calculation.contains(range.commonAncestorContainer)) {
            const preRange = range.cloneRange();
            preRange.selectNodeContents(calculation);
            preRange.setEnd(range.startContainer, range.startOffset);
            const start = preRange.toString().length;

            const preRangeEnd = range.cloneRange();
            preRangeEnd.selectNodeContents(calculation);
            preRangeEnd.setEnd(range.endContainer, range.endOffset);
            const end = preRangeEnd.toString().length;

            savedSelection = { start, end };
            return;
        }
    }
}

function getValidSelection() {
    let start = savedSelection.start;
    let end = savedSelection.end;
    const len = expression.length;
    if (start < 0 || start > len) start = len;
    if (end < 0 || end > len) end = len;
    if (start > end) { const tmp = start; start = end; end = tmp; }
    return { start, end };
}

function setCaretPosition(offset, shouldFocus = true) {
    if (!calculation) return;

    if (shouldFocus) {
        calculation.focus();
    }

    const sel = window.getSelection();
    if (!sel) return;

    if (calculation.childNodes.length === 0) {
        savedSelection = { start: 0, end: 0 };
        return;
    }

    let currentOffset = 0;
    let targetNode = null;
    let targetOffset = 0;

    function traverse(node) {
        if (targetNode) return;
        if (node.nodeType === Node.TEXT_NODE) {
            const len = node.nodeValue.length;
            if (currentOffset + len >= offset) {
                targetNode = node;
                targetOffset = offset - currentOffset;
            } else {
                currentOffset += len;
            }
        } else {
            for (let child of node.childNodes) {
                traverse(child);
            }
        }
    }

    traverse(calculation);

    const range = document.createRange();
    if (targetNode) {
        range.setStart(targetNode, Math.min(targetOffset, targetNode.nodeValue.length));
        range.setEnd(targetNode, Math.min(targetOffset, targetNode.nodeValue.length));
    } else {
        range.selectNodeContents(calculation);
        range.collapse(false);
    }

    sel.removeAllRanges();
    sel.addRange(range);
    savedSelection = { start: offset, end: offset };
}

function insertTextAtCursor(text) {
    if (finalized) {
        expression = "";
        finalized = false;
        savedSelection = { start: 0, end: 0 };
    }

    const { start, end } = getValidSelection();
    expression = expression.slice(0, start) + text + expression.slice(end);
    const newCaretPos = start + text.length;

    updateDisplay();
    setCaretPosition(newCaretPos, true);
}

function backspaceAtCursor() {
    if (finalized) {
        expression = "";
        finalized = false;
        savedSelection = { start: 0, end: 0 };
        updateDisplay();
        setCaretPosition(0, true);
        return;
    }

    const { start, end } = getValidSelection();
    let newCaretPos = start;

    if (start !== end) {
        expression = expression.slice(0, start) + expression.slice(end);
        newCaretPos = start;
    } else if (start > 0) {
        expression = expression.slice(0, start - 1) + expression.slice(start);
        newCaretPos = start - 1;
    }

    updateDisplay();
    setCaretPosition(newCaretPos, true);
}

/* PARSER & EVALUATOR */
function tokenize(str) {
    const tokens = [];
    let i = 0;

    while (i < str.length) {
        const char = str[i];

        if (char === "−" || char === "-") {
            tokens.push("−");
            i++;
            continue;
        }

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

/* DISPLAY UPDATES & DIRECT EDITING LISTENERS */
function updateDisplay() {
    if (calculation) {
        calculation.textContent = formatExpression(expression);
    }

    if (!expression) {
        result.textContent = "0";
        return;
    }

    const answer = evaluateExpression(expression);
    result.textContent = answer === null ? "0" : formatResult(answer);
}

if (calculation) {
    ["keyup", "mouseup", "touchend", "focus", "input", "selectionchange"].forEach(evt => {
        calculation.addEventListener(evt, saveCaretPosition);
    });

    calculation.addEventListener("input", () => {
        saveCaretPosition();
        let rawText = calculation.textContent
            .replaceAll("/", "÷")
            .replaceAll("*", "×")
            .replaceAll("-", "−");

        expression = rawText;
        
        if (calculation.textContent !== rawText) {
            const caret = savedSelection.start;
            calculation.textContent = rawText;
            setCaretPosition(caret);
        }

        const answer = evaluateExpression(expression);
        result.textContent = answer === null ? "0" : formatResult(answer);
    });

    calculation.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (equalsButton) equalsButton.click();
        }
    });
}

numberButtons.forEach(button => {
    bindFastClick(button, () => {
        triggerHaptic();
        const number = button.textContent.trim();
        insertTextAtCursor(number);
    });
});

operatorButtons.forEach(button => {
    bindFastClick(button, () => {
        triggerHaptic();
        const operator = button.dataset.operator;

        if (finalized) {
            expression = result.textContent;
            finalized = false;
            savedSelection = { start: expression.length, end: expression.length };
        }

        const { start, end } = getValidSelection();

        if (start !== end) {
            expression = expression.slice(0, start) + operator + expression.slice(end);
            updateDisplay();
            setCaretPosition(start + 1);
            return;
        }

        if (!expression && operator === "−") {
            insertTextAtCursor("−");
            return;
        }

        if (start > 0 && isOperator(expression[start - 1])) {
            expression = expression.slice(0, start - 1) + operator + expression.slice(start);
            updateDisplay();
            setCaretPosition(start);
        } else {
            insertTextAtCursor(operator);
        }
    });
});

if (percentageButton) {
    bindFastClick(percentageButton, () => {
        triggerHaptic();
        insertTextAtCursor("%");
    });
}

if (equalsButton) {
    bindFastClick(equalsButton, () => {
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
        savedSelection = { start: expression.length, end: expression.length };
    });
}

if (clearButton) {
    bindFastClick(clearButton, () => {
        triggerHaptic();
        expression = "";
        finalized = false;
        calculation.textContent = "";
        result.textContent = "0";
        savedSelection = { start: 0, end: 0 };
    });
}

if (backspaceButton) {
    bindFastClick(backspaceButton, () => {
        triggerHaptic();
        backspaceAtCursor();
    });
}

if (signButton) {
    bindFastClick(signButton, () => {
        triggerHaptic();
        if (finalized) {
            expression = result.textContent;
            finalized = false;
            savedSelection = { start: expression.length, end: expression.length };
        }

        const { start } = getValidSelection();
        if (expression.startsWith("−")) {
            expression = expression.substring(1);
            updateDisplay();
            setCaretPosition(Math.max(0, start - 1));
        } else {
            expression = "−" + expression;
            updateDisplay();
            setCaretPosition(start + 1);
        }
    });
}

/* SETTINGS & OVERLAYS */
if (settingsButton && settingsOverlay) {
    bindFastClick(settingsButton, () => { triggerHaptic(); settingsOverlay.classList.add("active"); });
}
if (closeSettings && settingsOverlay) {
    bindFastClick(closeSettings, () => { triggerHaptic(); settingsOverlay.classList.remove("active"); });
}
if (settingsOverlay) {
    settingsOverlay.addEventListener("click", (e) => { if (e.target === settingsOverlay) settingsOverlay.classList.remove("active"); });
}

function updatePercentageSetting() {
    if (percentageProportional) percentageProportional.checked = percentageMode === "proportional";
    if (percentageNumerical) percentageNumerical.checked = percentageMode === "numerical";
}

if (percentageProportional) {
    percentageProportional.addEventListener("change", () => {
        if (percentageProportional.checked) {
            percentageMode = "proportional";
            localStorage.setItem("percentageMode", "proportional");
            updateDisplay();
        }
    });
}

if (percentageNumerical) {
    percentageNumerical.addEventListener("change", () => {
        if (percentageNumerical.checked) {
            percentageMode = "numerical";
            localStorage.setItem("percentageMode", "numerical");
            updateDisplay();
        }
    });
}

const themeButtons = document.querySelectorAll(".theme-option");
themeButtons.forEach(button => {
    bindFastClick(button, () => {
        triggerHaptic();
        const theme = button.dataset.theme;

        if (theme === "custom") {
            if (backgroundImageInput) backgroundImageInput.click();
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

if (backgroundImageInput) {
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
}

if (removeBackground) {
    bindFastClick(removeBackground, () => {
        triggerHaptic();
        document.body.style.backgroundImage = "";
        document.body.removeAttribute("data-theme");
        localStorage.removeItem("calculatorCustomBackground");
        localStorage.setItem("calculatorTheme", "light");
    });
}

/* HISTORY */
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
    if (!historyList) return;

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
        bindFastClick(item, () => {
            triggerHaptic();
            const idx = item.dataset.index;
            expression = history[idx].answer;
            finalized = false;
            updateDisplay();
            if (historyOverlay) historyOverlay.classList.remove("active");
            setCaretPosition(expression.length);
        });
    });
}

if (historyButton && historyOverlay) {
    bindFastClick(historyButton, () => { triggerHaptic(); renderHistory(); historyOverlay.classList.add("active"); });
}
if (closeHistory && historyOverlay) {
    bindFastClick(closeHistory, () => { triggerHaptic(); renderHistory(); historyOverlay.classList.remove("active"); });
}
if (historyOverlay) {
    historyOverlay.addEventListener("click", (e) => { if (e.target === historyOverlay) historyOverlay.classList.remove("active"); });
}

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

/* DYNAMIC STYLES INTEGRATION (PREVENT DOUBLE TAP ZOOM & SELECTION ACCELERATION) */
const dynamicStyles = document.createElement("style");
dynamicStyles.innerHTML = `
    button, input[type="button"], .mode-btn, .number, .operator, .equals {
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
    }
    .calculation {
        min-height: 1.5em;
        font-size: 30px;
        line-height: 1.35;
        text-align: right;
        word-break: break-all;
        color: var(--muted);
        outline: none;
        border: none;
        padding-top: 28px;
    }
    .result {
        text-align: right;
        font-size: 60px;
        line-height: 1.1;
        font-weight: bold;
        word-break: break-word;
    }
    .modes {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 10px;
    }
    .mode-btn {
        padding: 14px 5px;
        font-size: 18px;
        font-weight: 700;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
`;
document.head.appendChild(dynamicStyles);

/* INTEREST CALCULATOR LOGIC */
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
let interestClearButton = document.getElementById("interestClearButton");

if (interestActions && !interestClearButton) {
    interestClearButton = document.createElement("button");
    interestClearButton.id = "interestClearButton";
    interestClearButton.textContent = "Clear";
    interestClearButton.type = "button";
    interestActions.appendChild(interestClearButton);
}

function formatInterestNumber(value) {
    if (!Number.isFinite(value)) return "0";
    const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
    return String(rounded);
}

function getInterestYears() {
    if (!interestTime || !interestTimeUnit) return 0;
    const time = Number(interestTime.value);
    if (!Number.isFinite(time) || time < 0) return 0;
    if (interestTimeUnit.value === "months") return time / 12;
    if (interestTimeUnit.value === "days") return time / 365;
    return time;
}

function calculateInterest() {
    if (!interestAmount || !interestRate || !interestTime || !interestResult || !interestFinalAmount) return;

    const principal = Number(interestAmount.value);
    const rate = Number(interestRate.value);
    const years = getInterestYears();

    if (interestAmount.value === "" || interestRate.value === "" || interestTime.value === "") {
        interestResult.textContent = "0";
        interestFinalAmount.textContent = "0";
        if (interestExplanation) {
            interestExplanation.innerHTML = `
                <div class="formula-line"><strong>Simple Interest:</strong> Interest = (Principal × Rate × Time) ÷ 100</div>
                <div class="formula-line"><strong>Compound Interest:</strong> Amount = Principal × (1 + Rate ÷ 100)<sup>Time</sup></div>
            `;
        }
        return;
    }

    if (!Number.isFinite(principal) || !Number.isFinite(rate) || !Number.isFinite(years)) {
        interestResult.textContent = "0";
        interestFinalAmount.textContent = "0";
        if (interestExplanation) interestExplanation.innerHTML = `<div>Please enter valid numbers.</div>`;
        return;
    }

    let earnedInterest = 0;
    let finalAmount = principal;

    if (interestType === "simple") {
        earnedInterest = principal * (rate / 100) * years;
        finalAmount = principal + (interestDirection * earnedInterest);
        
        if (interestExplanation) {
            interestExplanation.innerHTML = `
                <div class="formula-line"><strong>Formula:</strong> Interest = (Principal × Rate × Time) ÷ 100</div>
                <div class="formula-line"><strong>Calculation:</strong> (${formatInterestNumber(principal)} × ${formatInterestNumber(rate)} × ${formatInterestNumber(years)}) ÷ 100 = ${formatInterestNumber(earnedInterest)}</div>
                <div><strong>Total Balance:</strong> ${formatInterestNumber(finalAmount)}</div>
            `;
        }
    } else {
        const frequency = Number(compoundFrequencySelect ? compoundFrequencySelect.value : 1);
        const periodicRate = rate / 100 / frequency;
        const periods = frequency * years;
        const amountAfterGrowth = principal * Math.pow(1 + periodicRate, periods);

        earnedInterest = amountAfterGrowth - principal;
        finalAmount = principal + (interestDirection * earnedInterest);

        if (interestExplanation) {
            interestExplanation.innerHTML = `
                <div class="formula-line"><strong>Formula:</strong> Total = Principal × (1 + Rate ÷ Frequency)^(Periods)</div>
                <div class="formula-line"><strong>Calculation:</strong> ${formatInterestNumber(principal)} × (1 + ${formatInterestNumber(rate / 100)} ÷ ${frequency})^${formatInterestNumber(periods)} = ${formatInterestNumber(amountAfterGrowth)}</div>
                <div><strong>Earned Interest:</strong> ${formatInterestNumber(earnedInterest)}</div>
            `;
        }
    }

    interestResult.textContent = formatInterestNumber(earnedInterest);
    interestFinalAmount.textContent = formatInterestNumber(finalAmount);
}

if (simpleInterestButton) {
    bindFastClick(simpleInterestButton, function() {
        triggerHaptic();
        interestType = "simple";
        simpleInterestButton.classList.add("active");
        if (compoundInterestButton) compoundInterestButton.classList.remove("active");
        if (compoundFrequency) compoundFrequency.classList.remove("active");
        calculateInterest();
    });
}

if (compoundInterestButton) {
    bindFastClick(compoundInterestButton, function() {
        triggerHaptic();
        interestType = "compound";
        compoundInterestButton.classList.add("active");
        if (simpleInterestButton) simpleInterestButton.classList.remove("active");
        if (compoundFrequency) compoundFrequency.classList.add("active");
        calculateInterest();
    });
}

if (addInterestButton) {
    bindFastClick(addInterestButton, function() {
        triggerHaptic();
        interestDirection = 1;
        addInterestButton.classList.add("active");
        if (subtractInterestButton) subtractInterestButton.classList.remove("active");
        calculateInterest();
    });
}

if (subtractInterestButton) {
    bindFastClick(subtractInterestButton, function() {
        triggerHaptic();
        interestDirection = -1;
        subtractInterestButton.classList.add("active");
        if (addInterestButton) addInterestButton.classList.remove("active");
        calculateInterest();
    });
}

if (interestClearButton) {
    bindFastClick(interestClearButton, function() {
        triggerHaptic();
        if (interestAmount) interestAmount.value = "";
        if (interestRate) interestRate.value = "";
        if (interestTime) interestTime.value = "";
        if (interestResult) interestResult.textContent = "0";
        if (interestFinalAmount) interestFinalAmount.textContent = "0";
        calculateInterest();
        if (interestAmount) interestAmount.focus();
    });
}

[interestAmount, interestRate, interestTime, interestTimeUnit, compoundFrequencySelect].forEach(function(element) {
    if (element) {
        element.addEventListener("input", calculateInterest);
        element.addEventListener("change", calculateInterest);
    }
});

if (interestModeButton) {
    bindFastClick(interestModeButton, function() {
        triggerHaptic();
        if (display) display.style.display = "none";
        if (keypad) keypad.style.display = "none";
        if (modes) modes.style.display = "none";

        if (scientificCalculator) scientificCalculator.classList.remove("active");
        if (scientificBackButton) scientificBackButton.hidden = true;
        if (othersCalculator) othersCalculator.classList.remove("active");
        if (othersBackButton) othersBackButton.hidden = true;
        if (saleCalculator) saleCalculator.classList.remove("active");
        if (saleBackButton) saleBackButton.hidden = true;

        if (interestCalculator) interestCalculator.classList.add("active");
        if (interestBackButton) interestBackButton.hidden = false;
        calculateInterest();
    });
}

if (interestBackButton) {
    bindFastClick(interestBackButton, function() {
        triggerHaptic();
        if (interestCalculator) interestCalculator.classList.remove("active");
        if (display) display.style.display = "";
        if (keypad) keypad.style.display = "";
        if (modes) modes.style.display = "";
        interestBackButton.hidden = true;
    });
}

/* OTHERS CALCULATOR (CONVERSION, BMI, AGE, EMI) */
const othersModeButton = document.getElementById("othersModeButton");
const othersCalculator = document.getElementById("othersCalculator");
const othersBackButton = document.getElementById("othersBackButton");

const othersSubConversion = document.getElementById("othersSubConversion");
const othersSubBMI = document.getElementById("othersSubBMI");
const othersSubAge = document.getElementById("othersSubAge");
const othersSubEMI = document.getElementById("othersSubEMI");

const subSectionConversion = document.getElementById("subSectionConversion");
const subSectionBMI = document.getElementById("subSectionBMI");
const subSectionAge = document.getElementById("subSectionAge");
const subSectionEMI = document.getElementById("subSectionEMI");

function setActiveSubMode(activeBtn, activeSection) {
    [othersSubConversion, othersSubBMI, othersSubAge, othersSubEMI].forEach(btn => { if (btn) btn.classList.remove("active"); });
    [subSectionConversion, subSectionBMI, subSectionAge, subSectionEMI].forEach(sec => { if (sec) sec.style.display = "none"; });

    if (activeBtn) activeBtn.classList.add("active");
    if (activeSection) activeSection.style.display = "block";
}

if (othersSubConversion) bindFastClick(othersSubConversion, function() { triggerHaptic(); setActiveSubMode(othersSubConversion, subSectionConversion); });
if (othersSubBMI) bindFastClick(othersSubBMI, function() { triggerHaptic(); setActiveSubMode(othersSubBMI, subSectionBMI); });
if (othersSubAge) bindFastClick(othersSubAge, function() { triggerHaptic(); setActiveSubMode(othersSubAge, subSectionAge); });
if (othersSubEMI) bindFastClick(othersSubEMI, function() { triggerHaptic(); setActiveSubMode(othersSubEMI, subSectionEMI); calculateEMI(); });

/* UNITS CONVERSION */
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
    if (!conversionCategory || !conversionFromUnit || !conversionToUnit) return;

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
    if (!conversionAmount || !conversionCategory || !conversionFromUnit || !conversionToUnit || !conversionFinalResult) return;

    const amount = Number(conversionAmount.value);
    const category = conversionCategory.value;
    const from = conversionFromUnit.value;
    const to = conversionToUnit.value;

    if (conversionAmount.value === "" || !Number.isFinite(amount)) {
        conversionFinalResult.textContent = "0";
        if (conversionExplanation) conversionExplanation.innerHTML = `<div>Enter an amount to convert.</div>`;
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
    if (conversionExplanation) {
        conversionExplanation.innerHTML = `
            <div class="formula-line"><strong>Conversion:</strong> ${amount} ${from} = ${formattedResult} ${to}</div>
        `;
    }
}

if (conversionCategory) conversionCategory.addEventListener("change", updateConversionDropdowns);
if (conversionAmount) conversionAmount.addEventListener("input", calculateConversion);
if (conversionFromUnit) conversionFromUnit.addEventListener("change", calculateConversion);
if (conversionToUnit) conversionToUnit.addEventListener("change", calculateConversion);

/* BMI CALCULATOR */
const bmiWeight = document.getElementById("bmiWeight");
const bmiHeight = document.getElementById("bmiHeight");
const bmiResultVal = document.getElementById("bmiResultVal");
const bmiCategoryVal = document.getElementById("bmiCategoryVal");

function calculateBMI() {
    if (!bmiWeight || !bmiHeight || !bmiResultVal || !bmiCategoryVal) return;

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

if (bmiWeight) bmiWeight.addEventListener("input", calculateBMI);
if (bmiHeight) bmiHeight.addEventListener("input", calculateBMI);

/* AGE CALCULATOR */
const ageDob = document.getElementById("ageDob");
const ageFinalResult = document.getElementById("ageFinalResult");

function calculateAge() {
    if (!ageDob || !ageFinalResult) return;

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

if (ageDob) ageDob.addEventListener("change", calculateAge);

/* EMI CALCULATOR */
const emiAmount = document.getElementById("emiAmount");
const emiRate = document.getElementById("emiRate");
const emiTenure = document.getElementById("emiTenure");
const emiTenureUnit = document.getElementById("emiTenureUnit");

const emiMonthlyVal = document.getElementById("emiMonthlyVal");
const emiTotalInterestVal = document.getElementById("emiTotalInterestVal");
const emiTotalPayableVal = document.getElementById("emiTotalPayableVal");
const shareEmiButton = document.getElementById("shareEmiButton");

function calculateEMI() {
    if (!emiAmount || !emiRate || !emiTenure || !emiTenureUnit || !emiMonthlyVal || !emiTotalInterestVal || !emiTotalPayableVal) return;

    const P = Number(emiAmount.value);
    const annualRate = Number(emiRate.value);
    let tenureVal = Number(emiTenure.value);

    if (!P || !annualRate || !tenureVal || P <= 0 || annualRate <= 0 || tenureVal <= 0) {
        emiMonthlyVal.textContent = "0";
        emiTotalInterestVal.textContent = "0";
        emiTotalPayableVal.textContent = "0";
        return;
    }

    const n = emiTenureUnit.value === "years" ? tenureVal * 12 : tenureVal;
    const r = annualRate / 12 / 100;

    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPayment = emi * n;
    const totalInterest = totalPayment - P;

    emiMonthlyVal.textContent = formatInterestNumber(emi);
    emiTotalInterestVal.textContent = formatInterestNumber(totalInterest);
    emiTotalPayableVal.textContent = formatInterestNumber(totalPayment);
}

[emiAmount, emiRate, emiTenure, emiTenureUnit].forEach(el => {
    if (el) {
        el.addEventListener("input", calculateEMI);
        el.addEventListener("change", calculateEMI);
    }
});

if (shareEmiButton) {
    bindFastClick(shareEmiButton, function() {
        triggerHaptic();
        const text = `EMI Breakdown:\nLoan Amount: ${emiAmount ? emiAmount.value : 0}\nInterest Rate: ${emiRate ? emiRate.value : 0}%\nTenure: ${emiTenure ? emiTenure.value : 0} ${emiTenureUnit ? emiTenureUnit.value : ''}\nMonthly EMI: ${emiMonthlyVal ? emiMonthlyVal.textContent : 0}\nTotal Interest: ${emiTotalInterestVal ? emiTotalInterestVal.textContent : 0}\nTotal Payable: ${emiTotalPayableVal ? emiTotalPayableVal.textContent : 0}`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                shareEmiButton.textContent = "✅ Copied Breakdown to Clipboard!";
                setTimeout(() => { shareEmiButton.textContent = "📤 Share EMI Breakdown"; }, 2000);
            });
        }
    });
}

if (othersModeButton) {
    bindFastClick(othersModeButton, function() {
        triggerHaptic();
        if (display) display.style.display = "none";
        if (keypad) keypad.style.display = "none";
        if (modes) modes.style.display = "none";

        if (interestCalculator) interestCalculator.classList.remove("active");
        if (interestBackButton) interestBackButton.hidden = true;
        if (scientificCalculator) scientificCalculator.classList.remove("active");
        if (scientificBackButton) scientificBackButton.hidden = true;
        if (saleCalculator) saleCalculator.classList.remove("active");
        if (saleBackButton) saleBackButton.hidden = true;

        if (othersCalculator) othersCalculator.classList.add("active");
        if (othersBackButton) othersBackButton.hidden = false;

        updateConversionDropdowns();
    });
}

if (othersBackButton) {
    bindFastClick(othersBackButton, function() {
        triggerHaptic();
        if (othersCalculator) othersCalculator.classList.remove("active");
        othersBackButton.hidden = true;

        if (display) display.style.display = "";
        if (keypad) keypad.style.display = "";
        if (modes) modes.style.display = "";
    });
}

/* SALE CALCULATOR */
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
    if (!saleOriginalPrice || !saleDiscountRate || !saleYouSave || !saleFinalPrice) return;

    const price = Number(saleOriginalPrice.value);
    const discount = Number(saleDiscountRate.value);

    if (saleOriginalPrice.value === "" || !Number.isFinite(price)) {
        saleYouSave.textContent = "0";
        saleFinalPrice.textContent = "0";
        if (saleExplanation) {
            saleExplanation.innerHTML = `
                <div class="formula-line"><strong>Formula:</strong> Original Price - Discount % = Final Price</div>
                <div>Enter an original price to calculate.</div>
            `;
        }
        return;
    }

    const discountPercent = Number.isFinite(discount) ? discount : 0;
    const savings = price * (discountPercent / 100);
    const final = price - savings;

    saleYouSave.textContent = formatSaleNumber(savings);
    saleFinalPrice.textContent = formatSaleNumber(final);
    
    if (saleExplanation) {
        saleExplanation.innerHTML = `
            <div class="formula-line"><strong>Formula:</strong> Original Price - Discount Amount = Final Price</div>
            <div class="formula-line"><strong>Calculation:</strong> ${formatSaleNumber(price)} - (${formatSaleNumber(price)} × ${formatSaleNumber(discountPercent / 100)}) = ${formatSaleNumber(final)}</div>
            <div><strong>You Save:</strong> ${formatSaleNumber(savings)}</div>
        `;
    }
}

[saleOriginalPrice, saleDiscountRate].forEach(function(element) {
    if (element) {
        element.addEventListener("input", calculateSale);
        element.addEventListener("change", calculateSale);
    }
});

if (shareSaleButton) {
    bindFastClick(shareSaleButton, function() {
        triggerHaptic();
        const text = `Sale Breakdown:\nOriginal Price: ${saleOriginalPrice ? saleOriginalPrice.value : 0}\nDiscount: ${saleDiscountRate ? saleDiscountRate.value : 0}%\nYou Save: ${saleYouSave ? saleYouSave.textContent : 0}\nFinal Price: ${saleFinalPrice ? saleFinalPrice.textContent : 0}`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function() {
                shareSaleButton.textContent = "✅ Copied Breakdown to Clipboard!";
                setTimeout(() => { shareSaleButton.textContent = "📤 Share Sale Breakdown"; }, 2000);
            });
        }
    });
}

const shareInterestButton = document.getElementById("shareInterestButton");

if (shareInterestButton) {
    bindFastClick(shareInterestButton, function() {
        triggerHaptic();
        const text = `Interest Breakdown (${interestType.toUpperCase()}):\nPrincipal: ${interestAmount ? interestAmount.value : 0}\nRate: ${interestRate ? interestRate.value : 0}%\nTime: ${interestTime ? interestTime.value : 0} ${interestTimeUnit ? interestTimeUnit.value : ''}\nInterest Earned: ${interestResult ? interestResult.textContent : 0}\nFinal Amount: ${interestFinalAmount ? interestFinalAmount.textContent : 0}`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function() {
                shareInterestButton.textContent = "✅ Copied Breakdown to Clipboard!";
                setTimeout(() => { shareInterestButton.textContent = "📤 Share Interest Breakdown"; }, 2000);
            });
        }
    });
}

if (saleModeButton) {
    bindFastClick(saleModeButton, function() {
        triggerHaptic();
        if (display) display.style.display = "none";
        if (keypad) keypad.style.display = "none";
        if (modes) modes.style.display = "none";

        if (interestCalculator) interestCalculator.classList.remove("active");
        if (interestBackButton) interestBackButton.hidden = true;
        if (othersCalculator) othersCalculator.classList.remove("active");
        if (othersBackButton) othersBackButton.hidden = true;
        if (scientificCalculator) scientificCalculator.classList.remove("active");
        if (scientificBackButton) scientificBackButton.hidden = true;

        if (saleCalculator) saleCalculator.classList.add("active");
        if (saleBackButton) saleBackButton.hidden = false;
        calculateSale();
    });
}

if (saleBackButton) {
    bindFastClick(saleBackButton, function() {
        triggerHaptic();
        if (saleCalculator) saleCalculator.classList.remove("active");
        saleBackButton.hidden = true;

        if (display) display.style.display = "";
        if (keypad) keypad.style.display = "";
        if (modes) modes.style.display = "";
    });
}

/* SCIENTIFIC CALCULATOR LOGIC */
const scientificModeButton = document.getElementById("scientificModeButton");
const scientificCalculator = document.getElementById("scientificCalculator");
const scientificBackButton = document.getElementById("scientificBackButton");
const degRadToggle = document.getElementById("degRadToggle");

if (degRadToggle) {
    bindFastClick(degRadToggle, function() {
        triggerHaptic();
        isDegreeMode = !isDegreeMode;
        degRadToggle.textContent = isDegreeMode ? "DEG" : "RAD";
    });
}

if (scientificModeButton) {
    bindFastClick(scientificModeButton, function() {
        triggerHaptic();
        if (display) display.style.display = "";
        if (keypad) keypad.style.display = "";
        if (modes) modes.style.display = "none";

        if (interestCalculator) interestCalculator.classList.remove("active");
        if (interestBackButton) interestBackButton.hidden = true;
        if (othersCalculator) othersCalculator.classList.remove("active");
        if (othersBackButton) othersBackButton.hidden = true;
        if (saleCalculator) saleCalculator.classList.remove("active");
        if (saleBackButton) saleBackButton.hidden = true;

        if (scientificCalculator) scientificCalculator.classList.add("active");
        if (scientificBackButton) scientificBackButton.hidden = false;
    });
}

if (scientificBackButton) {
    bindFastClick(scientificBackButton, function() {
        triggerHaptic();
        if (scientificCalculator) scientificCalculator.classList.remove("active");
        scientificBackButton.hidden = true;

        if (display) display.style.display = "";
        if (keypad) keypad.style.display = "";
        if (modes) modes.style.display = "";
    });
}

const sciButtons = document.querySelectorAll(".sci-btn");

sciButtons.forEach(function(button) {
    bindFastClick(button, function() {
        triggerHaptic();
        const action = button.dataset.action;

        if (action === "powY") {
            insertTextAtCursor("^");
            return;
        }

        if (action === "rootY") {
            insertTextAtCursor("√");
            return;
        }

        if (action === "pi") {
            insertTextAtCursor("π");
            return;
        }

        if (action === "e") {
            insertTextAtCursor("e");
            return;
        }

        let currentValue = Number(result.textContent);
        let computedValue = currentValue;
        let displayExpression = "";

        const angleFactor = isDegreeMode ? Math.PI / 180 : 1;

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
                computedValue = Math.sin(currentValue * angleFactor);
                displayExpression = `sin(${currentValue})`;
                break;
            case "cos":
                computedValue = Math.cos(currentValue * angleFactor);
                displayExpression = `cos(${currentValue})`;
                break;
            case "tan":
                computedValue = Math.tan(currentValue * angleFactor);
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
        }

        calculation.textContent = displayExpression;
        result.textContent = formatResult(computedValue);
        expression = String(computedValue);
        finalized = true;
        savedSelection = { start: expression.length, end: expression.length };
    });
});

/* VOICE RECOGNITION */
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

    bindFastClick(micButton, function() {
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
        if (equalsButton) equalsButton.click();
    };

    recognition.onerror = function() { micButton.style.opacity = "1"; isListening = false; };
    recognition.onend = function() { micButton.style.opacity = "1"; isListening = false; };
} else if (micButton) {
    micButton.style.display = "none";
}

/* APP SETTINGS & SHARE */
const shareAppSettingButton = document.getElementById("shareAppSettingButton");

if (shareAppSettingButton) {
    bindFastClick(shareAppSettingButton, function() {
        triggerHaptic();
        const shareData = {
            title: "Easy Calculator",
            text: "Check out this awesome and lightweight Easy Calculator app with built-in scientific, interest, EMI, and unit converters!",
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
    hapticsToggle.checked = savedHaptics !== "false";

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
    bindFastClick(removeAdsButton, function() {
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

/* KEYBOARD SUPPORT */
window.addEventListener("keydown", function(event) {
    if (
        ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName) ||
        document.activeElement.isContentEditable
    ) {
        return;
    }

    const key = event.key;

    if (!isNaN(key) || key === ".") {
        event.preventDefault();
        insertTextAtCursor(key);
    } else if (key === "+") {
        event.preventDefault();
        insertTextAtCursor("+");
    } else if (key === "-") {
        event.preventDefault();
        insertTextAtCursor("−");
    } else if (key === "*") {
        event.preventDefault();
        insertTextAtCursor("×");
    } else if (key === "/") {
        event.preventDefault();
        insertTextAtCursor("÷");
    } else if (key === "(" || key === ")") {
        event.preventDefault();
        insertTextAtCursor(key);
    } else if (key === "Enter" || key === "=") {
        event.preventDefault();
        if (equalsButton) equalsButton.click();
    } else if (key === "Backspace") {
        event.preventDefault();
        backspaceAtCursor();
    } else if (key === "Escape") {
        event.preventDefault();
        if (clearButton) clearButton.click();
    } else if (key === "%") {
        event.preventDefault();
        insertTextAtCursor("%");
    }
});

/* BRACKET BUTTONS */
const bracketButtons = document.querySelectorAll(".bracket");
bracketButtons.forEach(button => {
    bindFastClick(button, () => {
        triggerHaptic();
        const bracket = button.dataset.bracket || button.textContent.trim();
        insertTextAtCursor(bracket);
    });
});
