/* =========================================================
   EASY CALCULATOR
   COMPLETE UPGRADED SCRIPT (NO BORDERS / NO MEMORY)
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

const numberButtons =
    document.querySelectorAll(".number");

const operatorButtons =
    document.querySelectorAll(".operator");

const result =
    document.getElementById("result");

const calculation =
    document.getElementById("calculation");

const equalsButton =
    document.querySelector(".equals");

const clearButton =
    document.querySelector(".clear");

const backspaceButton =
    document.querySelector(".backspace");

const signButton =
    document.querySelector(".sign");

const percentageButton =
    document.querySelector(".percentage");


/* =========================================================
   SETTINGS
   ========================================================= */

const settingsButton =
    document.getElementById("settingsButton");

const settingsOverlay =
    document.getElementById("settingsOverlay");

const closeSettings =
    document.getElementById("closeSettings");


/* =========================================================
   HISTORY
   ========================================================= */

const historyButton =
    document.getElementById("historyButton");

const historyOverlay =
    document.getElementById("historyOverlay");

const closeHistory =
    document.getElementById("closeHistory");

const historyList =
    document.getElementById("historyList");


/* =========================================================
   BACKGROUND
   ========================================================= */

const backgroundImageInput =
    document.getElementById(
        "backgroundImageInput"
    );

const removeBackground =
    document.getElementById(
        "removeBackground"
    );


/* =========================================================
   LARGE BUTTONS
   ========================================================= */

const largeButtonsToggle =
    document.getElementById(
        "largeButtonsToggle"
    );


/* =========================================================
   PERCENTAGE SETTINGS
   ========================================================= */

const percentageProportional =
    document.getElementById(
        "percentageProportional"
    );

const percentageNumerical =
    document.getElementById(
        "percentageNumerical"
    );


/* =========================================================
   CALCULATOR STATE
   ========================================================= */

let expression = "";

let finalized = false;

let percentageMode =
    localStorage.getItem(
        "percentageMode"
    ) || "proportional";


const operators = [
    "+",
    "−",
    "×",
    "÷"
];


/* =========================================================
   OPERATOR HELPER
   ========================================================= */

function isOperator(value) {

    return operators.includes(value);

}


/* =========================================================
   EXPRESSION HELPERS
   ========================================================= */

function cleanExpression(value) {

    return value.replace(/\s/g, "");

}


function formatExpression(value) {

    return value
        .replaceAll("×", " × ")
        .replaceAll("÷", " ÷ ")
        .replaceAll("+", " + ")
        .replaceAll("−", " − ")
        .replace(/\s+/g, " ")
        .trim();

}


/* =========================================================
   TRAILING NUMBER
   ========================================================= */

function getTrailingNumber() {

    const clean =
        cleanExpression(expression);

    const match =
        clean.match(
            /-?\d+(?:\.\d*)?%?$/
        );

    return match
        ? match[0]
        : "";

}


/* =========================================================
   REPLACE TRAILING NUMBER
   ========================================================= */

function replaceTrailingNumber(newNumber) {

    const clean =
        cleanExpression(expression);

    const match =
        clean.match(
            /-?\d+(?:\.\d*)?%?$/
        );

    if (!match) {

        expression += newNumber;

        return;

    }

    expression =
        clean.slice(
            0,
            match.index
        ) +
        newNumber;

}


/* =========================================================
   FORMAT RESULT
   ========================================================= */

function formatResult(value) {

    if (
        typeof value === "string"
    ) {

        return value;

    }

    if (
        !Number.isFinite(value)
    ) {

        return "Error";

    }

    const rounded =
        Math.round(
            (
                value +
                Number.EPSILON
            ) *
            1000000000000
        ) /
        1000000000000;

    return String(rounded);

}


/* =========================================================
   EVALUATE EXPRESSION
   ========================================================= */

function evaluateExpression(input) {

    let value =
        cleanExpression(input);

    while (
        value.length > 0 &&
        isOperator(
            value.at(-1)
        )
    ) {

        value =
            value.slice(
                0,
                -1
            );

    }

    if (!value) {

        return 0;

    }

    const tokens =
        value
            .split(
                /([+−×÷])/
            )
            .filter(Boolean);

    let numbers = [];

    let ops = [];

    for (
        const token of tokens
    ) {

        if (
            isOperator(token)
        ) {

            ops.push(token);

        }

        else {

            let text =
                token;

            let percentage =
                false;

            if (
                text.endsWith("%")
            ) {

                percentage =
                    true;

                text =
                    text.slice(
                        0,
                        -1
                    );

            }

            const number =
                Number(text);

            if (
                !Number.isFinite(
                    number
                )
            ) {

                return null;

            }

            numbers.push({

                value:
                    number,

                percentage:
                    percentage

            });

        }

    }

    if (
        numbers.length === 1 &&
        numbers[0].percentage
    ) {

        return (
            numbers[0].value /
            100
        );

    }

    if (
        numbers.length !==
        ops.length + 1
    ) {

        return null;

    }

    let values = [
        numbers[0].value
    ];

    let remainingOps = [];

    for (
        let i = 0;
        i < ops.length;
        i++
    ) {

        const operator =
            ops[i];

        const next =
            numbers[i + 1];

        let nextValue =
            next.value;

        if (
            next.percentage
        ) {

            nextValue =
                next.value / 100;

        }

        if (
            operator === "×"
        ) {

            values[
                values.length - 1
            ] *= nextValue;

        }

        else if (
            operator === "÷"
        ) {

            if (
                nextValue === 0
            ) {

                return "Cannot divide by 0";

            }

            values[
                values.length - 1
            ] /= nextValue;

        }

        else {

            remainingOps.push(
                operator
            );

            values.push(
                next.value
            );

        }

    }

    let answer =
        values[0];

    for (
        let i = 0;
        i < remainingOps.length;
        i++
    ) {

        const operator =
            remainingOps[i];

        const originalNumber =
            numbers[i + 1];

        let nextValue =
            values[i + 1];

        if (
            percentageMode ===
            "proportional" &&

            originalNumber.percentage
        ) {

            nextValue =
                answer *
                (
                    originalNumber.value /
                    100
                );

        }

        else if (
            originalNumber.percentage
        ) {

            nextValue =
                originalNumber.value /
                100;

        }

        if (
            operator === "+"
        ) {

            answer +=
                nextValue;

        }

        else if (
            operator === "−"
        ) {

            answer -=
                nextValue;

        }

    }

    return answer;

}


/* =========================================================
   UPDATE DISPLAY
   ========================================================= */

function updateDisplay() {

    calculation.textContent =
        formatExpression(
            expression
        );

    if (
        !expression
    ) {

        result.textContent =
            "0";

        return;

    }

    const answer =
        evaluateExpression(
            expression
        );

    if (
        answer === null
    ) {

        const current =
            getTrailingNumber();

        result.textContent =
            current || "0";

        return;

    }

    result.textContent =
        formatResult(
            answer
        );

}


/* =========================================================
   NUMBER BUTTONS
   ========================================================= */

numberButtons.forEach(
    function(button) {

        button.addEventListener(
            "click",
            function() {
                triggerHaptic();

                const number =
                    button.textContent.trim();

                if (
                    finalized
                ) {

                    expression = "";

                    finalized =
                        false;

                }

                const current =
                    getTrailingNumber();

                if (
                    number === "."
                ) {

                    if (
                        current.includes(".")
                    ) {

                        return;

                    }

                    if (
                        !current
                    ) {

                        expression +=
                            "0.";

                    }

                    else if (
                        current === "-"
                    ) {

                        expression +=
                            "0.";

                    }

                    else {

                        expression +=
                            ".";

                    }

                    updateDisplay();

                    return;

                }

                if (
                    current === "0"
                ) {

                    replaceTrailingNumber(
                        number
                    );

                }

                else {

                    expression +=
                        number;

                }

                updateDisplay();

            }
        );

    }
);


/* =========================================================
   OPERATOR BUTTONS
   ========================================================= */

operatorButtons.forEach(
    function(button) {

        button.addEventListener(
            "click",
            function() {
                triggerHaptic();

                const operator =
                    button.dataset.operator;

                if (
                    finalized
                ) {

                    expression =
                        result.textContent;

                    finalized =
                        false;

                }

                if (
                    !expression
                ) {

                    if (
                        operator === "−"
                    ) {

                        expression =
                            "−";

                    }

                    return;

                }

                if (
                    isOperator(
                        expression.at(-1)
                    )
                ) {

                    expression =
                        expression.slice(
                            0,
                            -1
                        ) +
                        operator;

                }

                else {

                    expression +=
                        operator;

                }

                updateDisplay();

            }
        );

    }
);


/* =========================================================
   PERCENTAGE
   ========================================================= */

percentageButton.addEventListener(
    "click",
    function() {
        triggerHaptic();

        if (
            finalized
        ) {

            expression =
                result.textContent;

            finalized =
                false;

        }

        const current =
            getTrailingNumber();

        if (
            !current
        ) {

            return;

        }

        if (
            current.endsWith("%")
        ) {

            return;

        }

        expression +=
            "%";

        updateDisplay();

    }
);


/* =========================================================
   EQUALS
   ========================================================= */

equalsButton.addEventListener(
    "click",
    function() {
        triggerHaptic();

        if (
            !expression
        ) {

            return;

        }

        const answer =
            evaluateExpression(
                expression
            );

        if (
            answer === null
        ) {

            return;

        }

        const finalAnswer =
            formatResult(
                answer
            );

        if (
            finalAnswer ===
            "Cannot divide by 0"
        ) {

            result.textContent =
                finalAnswer;

            return;

        }

        addHistory(
            formatExpression(
                expression
            ),
            finalAnswer
        );

        calculation.textContent =
            "";

        result.textContent =
            finalAnswer;

        expression =
            finalAnswer;

        finalized =
            true;

    }
);


/* =========================================================
   AC
   ========================================================= */

clearButton.addEventListener(
    "click",
    function() {
        triggerHaptic();

        expression = "";

        finalized =
            false;

        calculation.textContent =
            "";

        result.textContent =
            "0";

    }
);


/* =========================================================
   BACKSPACE
   ========================================================= */

backspaceButton.addEventListener(
    "click",
    function() {
        triggerHaptic();

        if (
            finalized
        ) {

            expression = "";

            finalized =
                false;

        }

        expression =
            expression.slice(
                0,
                -1
            );

        updateDisplay();

    }
);


/* =========================================================
   +/-
   ========================================================= */

signButton.addEventListener(
    "click",
    function() {
        triggerHaptic();

        if (
            finalized
        ) {

            expression =
                result.textContent;

            finalized =
                false;

        }

        const current =
            getTrailingNumber();

        if (
            !current
        ) {

            return;

        }

        if (
            current.endsWith("%")
        ) {

            return;

        }

        if (
            current.startsWith("-")
        ) {

            replaceTrailingNumber(
                current.substring(1)
            );

        }

        else {

            replaceTrailingNumber(
                "-" + current
            );

        }

        updateDisplay();

    }
);


/* =========================================================
   SETTINGS
   ========================================================= */

settingsButton.addEventListener(
    "click",
    function() {
        triggerHaptic();
        settingsOverlay.classList.add(
            "active"
        );

    }
);


closeSettings.addEventListener(
    "click",
    function() {
        triggerHaptic();
        settingsOverlay.classList.remove(
            "active"
        );

    }
);


settingsOverlay.addEventListener(
    "click",
    function(event) {

        if (
            event.target ===
            settingsOverlay
        ) {

            settingsOverlay.classList.remove(
                "active"
            );

        }

    }
);


/* =========================================================
   PERCENTAGE SETTINGS
   ========================================================= */

function updatePercentageSetting() {

    percentageProportional.checked =
        percentageMode ===
        "proportional";

    percentageNumerical.checked =
        percentageMode ===
        "numerical";

}


percentageProportional.addEventListener(
    "change",
    function() {

        if (
            percentageProportional.checked
        ) {

            percentageMode =
                "proportional";

            localStorage.setItem(
                "percentageMode",
                "proportional"
            );

            updateDisplay();

        }

    }
);


percentageNumerical.addEventListener(
    "change",
    function() {

        if (
            percentageNumerical.checked
        ) {

            percentageMode =
                "numerical";

            localStorage.setItem(
                "percentageMode",
                "numerical"
            );

            updateDisplay();

        }

    }
);


/* =========================================================
   THEMES
   ========================================================= */

const themeButtons =
    document.querySelectorAll(
        ".theme-option"
    );

themeButtons.forEach(
    function(button) {

        button.addEventListener(
            "click",
            function() {
                triggerHaptic();

                const theme =
                    button.dataset.theme;

                if (
                    theme === "custom"
                ) {

                    backgroundImageInput.click();

                    return;

                }

                document.body.style.backgroundImage =
                    "";

                if (
                    theme === "light"
                ) {

                    document.body.removeAttribute(
                        "data-theme"
                    );

                }

                else {

                    document.body.setAttribute(
                        "data-theme",
                        theme
                    );

                }

                localStorage.setItem(
                    "calculatorTheme",
                    theme
                );

            }
        );

    }
);


/* =========================================================
   CUSTOM BACKGROUND
   ========================================================= */

backgroundImageInput.addEventListener(
    "change",
    function() {

        const file =
            backgroundImageInput.files[0];

        if (
            !file
        ) {

            return;

        }

        const reader =
            new FileReader();

        reader.addEventListener(
            "load",
            function() {

                const image =
                    reader.result;

                document.body.style.backgroundImage =
                    `url("${image}")`;

                document.body.style.backgroundSize =
                    "cover";

                document.body.style.backgroundPosition =
                    "center";

                document.body.style.backgroundRepeat =
                    "no-repeat";

                document.body.removeAttribute(
                    "data-theme"
                );

                localStorage.setItem(
                    "calculatorCustomBackground",
                    image
                );

                localStorage.setItem(
                    "calculatorTheme",
                    "custom"
                );

            }
        );

        reader.readAsDataURL(file);

    }
);


/* =========================================================
   REMOVE CUSTOM BACKGROUND
   ========================================================= */

removeBackground.addEventListener(
    "click",
    function() {
        triggerHaptic();

        document.body.style.backgroundImage =
            "";

        document.body.removeAttribute(
            "data-theme"
        );

        localStorage.removeItem(
            "calculatorCustomBackground"
        );

        localStorage.setItem(
            "calculatorTheme",
            "light"
        );

    }
);


/* =========================================================
   HISTORY
   ========================================================= */

let history =
    JSON.parse(
        localStorage.getItem(
            "calculatorHistory"
        ) || "[]"
    );


function addHistory(
    equation,
    answer
) {

    history.unshift({

        equation:
            equation,

        answer:
            answer

    });

    history =
        history.slice(
            0,
            20
        );

    localStorage.setItem(
        "calculatorHistory",
        JSON.stringify(
            history
        )
    );

}


function escapeHtml(value) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


function renderHistory() {

    if (
        history.length === 0
    ) {

        historyList.innerHTML =
            '<p class="empty-history">No calculations yet.</p>';

        return;

    }

    historyList.innerHTML =
        history
            .map(
                function(item) {

                    return `
                        <div class="history-item">

                            <div>
                                ${escapeHtml(
                                    item.equation
                                )}
                            </div>

                            <strong>
                                = ${escapeHtml(
                                    item.answer
                                )}
                            </strong>

                        </div>
                    `;

                }
            )
            .join("");

}


historyButton.addEventListener(
    "click",
    function() {
        triggerHaptic();

        renderHistory();

        historyOverlay.classList.add(
            "active"
        );

    }
);


closeHistory.addEventListener(
    "click",
    function() {
        triggerHaptic();

        historyOverlay.classList.remove(
            "active"
        );

    }
);


historyOverlay.addEventListener(
    "click",
    function(event) {

        if (
            event.target ===
            historyOverlay
        ) {

            historyOverlay.classList.remove(
                "active"
            );

        }

    }
);


/* =========================================================
   LARGE BUTTONS
   ========================================================= */

largeButtonsToggle.addEventListener(
    "change",
    function() {
        triggerHaptic();

        document.body.classList.toggle(
            "large-buttons",
            largeButtonsToggle.checked
        );

        localStorage.setItem(
            "largeButtons",
            largeButtonsToggle.checked
                ? "true"
                : "false"
        );

    }
);


/* =========================================================
   LOAD THEME
   ========================================================= */

const savedTheme =
    localStorage.getItem(
        "calculatorTheme"
    );

if (
    savedTheme === "dark" ||
    savedTheme === "golden"
) {

    document.body.setAttribute(
        "data-theme",
        savedTheme
    );

}

const savedBackground =
    localStorage.getItem(
        "calculatorCustomBackground"
    );

if (
    savedTheme === "custom" &&
    savedBackground
) {

    document.body.style.backgroundImage =
        `url("${savedBackground}")`;

    document.body.style.backgroundSize =
        "cover";

    document.body.style.backgroundPosition =
        "center";

    document.body.style.backgroundRepeat =
        "no-repeat";

}

const savedLargeButtons =
    localStorage.getItem(
        "largeButtons"
    );

if (
    savedLargeButtons === "true"
) {

    largeButtonsToggle.checked =
        true;

    document.body.classList.add(
        "large-buttons"
    );

}

updatePercentageSetting();


/* =========================================================
   INTEREST CALCULATOR ELEMENTS
   ========================================================= */

const interestModeButton =
    document.getElementById(
        "interestModeButton"
    );

const interestCalculator =
    document.getElementById(
        "interestCalculator"
    );

const interestBackButton =
    document.getElementById(
        "interestBackButton"
    );

const keypad =
    document.querySelector(
        ".keypad"
    );

const display =
    document.querySelector(
        ".display"
    );

const modes =
    document.querySelector(
        ".modes"
    );

const interestAmount =
    document.getElementById(
        "interestAmount"
    );

const interestRate =
    document.getElementById(
        "interestRate"
    );

const interestTime =
    document.getElementById(
        "interestTime"
    );

const interestTimeUnit =
    document.getElementById(
        "interestTimeUnit"
    );

const compoundFrequency =
    document.getElementById(
        "compoundFrequency"
    );

const compoundFrequencySelect =
    document.getElementById(
        "compoundFrequencySelect"
    );

const simpleInterestButton =
    document.getElementById(
        "simpleInterestButton"
    );

const compoundInterestButton =
    document.getElementById(
        "compoundInterestButton"
    );

const addInterestButton =
    document.getElementById(
        "addInterestButton"
    );

const subtractInterestButton =
    document.getElementById(
        "subtractInterestButton"
    );

const interestResult =
    document.getElementById(
        "interestResult"
    );

const interestFinalAmount =
    document.getElementById(
        "interestFinalAmount"
    );

const interestExplanation =
    document.getElementById(
        "interestExplanation"
    );


/* =========================================================
   INTEREST STATE
   ========================================================= */

let interestType =
    "simple";

let interestDirection =
    1;


/* =========================================================
   CREATE INTEREST CLEAR BUTTON
   ========================================================= */

const interestActions =
    document.querySelector(
        ".interest-actions"
    );

const interestClearButton =
    document.createElement(
        "button"
    );

interestClearButton.id =
    "interestClearButton";

interestClearButton.textContent =
    "Clear";

interestClearButton.type =
    "button";

if (
    interestActions
) {

    interestActions.appendChild(
        interestClearButton
    );

}


/* =========================================================
   INTEREST NUMBER FORMAT
   ========================================================= */

function formatInterestNumber(value) {

    if (
        !Number.isFinite(value)
    ) {

        return "0";

    }

    const rounded =
        Math.round(
            (
                value +
                Number.EPSILON
            ) *
            100000000
        ) /
        100000000;

    return String(
        rounded
    );

}


/* =========================================================
   INTEREST TIME → YEARS
   ========================================================= */

function getInterestYears() {

    const time =
        Number(
            interestTime.value
        );

    if (
        !Number.isFinite(time) ||
        time < 0
    ) {

        return 0;

    }

    if (
        interestTimeUnit.value ===
        "months"
    ) {

        return time / 12;

    }

    if (
        interestTimeUnit.value ===
        "days"
    ) {

        return time / 365;

    }

    return time;

}


/* =========================================================
   CALCULATE INTEREST
   ========================================================= */

function calculateInterest() {

    const principal =
        Number(
            interestAmount.value
        );

    const rate =
        Number(
            interestRate.value
        );

    const years =
        getInterestYears();

    if (
        interestAmount.value === "" ||
        interestRate.value === "" ||
        interestTime.value === ""
    ) {

        interestResult.textContent =
            "0";

        interestFinalAmount.textContent =
            "0";

        interestExplanation.textContent =
            "Enter your amount, rate and time.";

        return;

    }

    if (
        !Number.isFinite(principal) ||
        !Number.isFinite(rate) ||
        !Number.isFinite(years)
    ) {

        interestResult.textContent =
            "0";

        interestFinalAmount.textContent =
            "0";

        interestExplanation.textContent =
            "Please enter valid numbers.";

        return;

    }

    let earnedInterest =
        0;

    let finalAmount =
        principal;

    if (
        interestType ===
        "simple"
    ) {

        earnedInterest =
            principal *
            (
                rate / 100
            ) *
            years;

        finalAmount =
            principal +
            (
                interestDirection *
                earnedInterest
            );

        interestExplanation.textContent =
            `Simple interest: ${formatInterestNumber(principal)} × ${formatInterestNumber(rate)}% × ${formatInterestNumber(years)} year(s) = ${formatInterestNumber(earnedInterest)} interest.`;

    }

    else {

        const frequency =
            Number(
                compoundFrequencySelect.value
            );

        const periodicRate =
            rate /
            100 /
            frequency;

        const periods =
            frequency *
            years;

        const amountAfterGrowth =
            principal *
            Math.pow(
                1 +
                periodicRate,
                periods
            );

        earnedInterest =
            amountAfterGrowth -
            principal;

        finalAmount =
            principal +
            (
                interestDirection *
                earnedInterest
            );

        interestExplanation.textContent =
            `Compound interest: ${formatInterestNumber(principal)} × (1 + ${formatInterestNumber(rate)}% ÷ ${frequency})^${formatInterestNumber(periods)} = ${formatInterestNumber(amountAfterGrowth)}. Interest = ${formatInterestNumber(earnedInterest)}.`;

    }

    interestResult.textContent =
        formatInterestNumber(
            earnedInterest
        );

    interestFinalAmount.textContent =
        formatInterestNumber(
            finalAmount
        );

}


simpleInterestButton.addEventListener(
    "click",
    function() {
        triggerHaptic();

        interestType =
            "simple";

        simpleInterestButton.classList.add(
            "active"
        );

        compoundInterestButton.classList.remove(
            "active"
        );

        compoundFrequency.classList.remove(
            "active"
        );

        calculateInterest();

    }
);


compoundInterestButton.addEventListener(
    "click",
    function() {
        triggerHaptic();

        interestType =
            "compound";

        compoundInterestButton.classList.add(
            "active"
        );

        simpleInterestButton.classList.remove(
            "active"
        );

        compoundFrequency.classList.add(
            "active"
        );

        calculateInterest();

    }
);


addInterestButton.addEventListener(
    "click",
    function() {
        triggerHaptic();

        interestDirection =
            1;

        addInterestButton.classList.add(
            "active"
        );

        subtractInterestButton.classList.remove(
            "active"
        );

        calculateInterest();

    }
);


subtractInterestButton.addEventListener(
    "click",
    function() {
        triggerHaptic();

        interestDirection =
            -1;

        subtractInterestButton.classList.add(
            "active"
        );

        addInterestButton.classList.remove(
            "active"
        );

        calculateInterest();

    }
);


interestClearButton.addEventListener(
    "click",
    function() {
        triggerHaptic();

        interestAmount.value =
            "";

        interestRate.value =
            "";

        interestTime.value =
            "";

        interestResult.textContent =
            "0";

        interestFinalAmount.textContent =
            "0";

        interestExplanation.textContent =
            "Enter your amount, rate and time.";

        calculateInterest();

        interestAmount.focus();

    }
);


[
    interestAmount,
    interestRate,
    interestTime,
    interestTimeUnit,
    compoundFrequencySelect
].forEach(
    function(element) {

        element.addEventListener(
            "input",
            calculateInterest
        );

        element.addEventListener(
            "change",
            calculateInterest
        );

    }
);


interestModeButton.addEventListener(
    "click",
    function() {
        triggerHaptic();

        display.style.display =
            "none";

        keypad.style.display =
            "none";

        modes.style.display =
            "none";

        scientificCalculator.classList.remove("active");
        scientificBackButton.hidden = true;
        conversionCalculator.classList.remove("active");
        conversionBackButton.hidden = true;
        saleCalculator.classList.remove("active");
        saleBackButton.hidden = true;

        interestCalculator.classList.add(
            "active"
        );

        interestBackButton.hidden =
            false;

        calculateInterest();

    }
);


interestBackButton.addEventListener(
    "click",
    function() {
        triggerHaptic();

        interestCalculator.classList.remove(
            "active"
        );

        display.style.display =
            "";

        keypad.style.display =
            "";

        modes.style.display =
            "";

        interestBackButton.hidden =
            true;

    }
);


interestType =
    "simple";

interestDirection =
    1;

simpleInterestButton.classList.add(
    "active"
);

compoundInterestButton.classList.remove(
    "active"
);

addInterestButton.classList.add(
    "active"
);

subtractInterestButton.classList.remove(
    "active"
);

compoundFrequency.classList.remove(
    "active"
);

interestBackButton.hidden =
    true;

updateDisplay();


/* =========================================================
   CONVERSION CALCULATOR ELEMENTS
   ========================================================= */

const conversionModeButton = document.getElementById("conversionModeButton");
const conversionCalculator = document.getElementById("conversionCalculator");
const conversionBackButton = document.getElementById("conversionBackButton");

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
        conversionExplanation.textContent = "Enter an amount to convert.";
        return;
    }

    let resultVal = 0;

    if (category === "temperature") {
        let tempInCelsius = amount;

        if (from === "fahrenheit") {
            tempInCelsius = (amount - 32) * 5/9;
        } else if (from === "kelvin") {
            tempInCelsius = amount - 273.15;
        }

        if (to === "celsius") {
            resultVal = tempInCelsius;
        } else if (to === "fahrenheit") {
            resultVal = (tempInCelsius * 9/5) + 32;
        } else if (to === "kelvin") {
            resultVal = tempInCelsius + 273.15;
        }
    } 
    else {
        const categoryData = units[category];
        const fromRate = categoryData.find(u => u.id === from).rate;
        const toRate = categoryData.find(u => u.id === to).rate;

        const baseAmount = amount / fromRate;
        resultVal = baseAmount * toRate;
    }

    const formattedResult = Math.round((resultVal + Number.EPSILON) * 10000) / 10000;
    
    conversionFinalResult.textContent = formattedResult;
    conversionExplanation.textContent = `${amount} ${from} = ${formattedResult} ${to}`;
}

conversionCategory.addEventListener("change", updateConversionDropdowns);
conversionAmount.addEventListener("input", calculateConversion);
conversionFromUnit.addEventListener("change", calculateConversion);
conversionToUnit.addEventListener("change", calculateConversion);

conversionModeButton.addEventListener("click", function() {
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

    conversionCalculator.classList.add("active");
    conversionBackButton.hidden = false;

    updateConversionDropdowns();
});

conversionBackButton.addEventListener("click", function() {
    triggerHaptic();
    conversionCalculator.classList.remove("active");
    conversionBackButton.hidden = true;

    display.style.display = "";
    keypad.style.display = "";
    modes.style.display = "";
});


/* =========================================================
   SALE CALCULATOR ELEMENTS & SHARE FEATURE
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
    if (!Number.isFinite(value)) {
        return "0";
    }
    const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
    return String(rounded);
}

function calculateSale() {
    const price = Number(saleOriginalPrice.value);
    const discount = Number(saleDiscountRate.value);

    if (saleOriginalPrice.value === "" || !Number.isFinite(price)) {
        saleYouSave.textContent = "0";
        saleFinalPrice.textContent = "0";
        saleExplanation.textContent = "Enter an original price to calculate.";
        return;
    }

    const discountPercent = Number.isFinite(discount) ? discount : 0;
    
    const savings = price * (discountPercent / 100);
    const final = price - savings;

    saleYouSave.textContent = formatSaleNumber(savings);
    saleFinalPrice.textContent = formatSaleNumber(final);
    
    saleExplanation.textContent = `Original: ${formatSaleNumber(price)} minus ${formatSaleNumber(discountPercent)}% (${formatSaleNumber(savings)}) = Final Price: ${formatSaleNumber(final)}.`;
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
    conversionCalculator.classList.remove("active");
    conversionBackButton.hidden = true;
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
   SCIENTIFIC CALCULATOR ELEMENTS & LOGIC
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
    conversionCalculator.classList.remove("active");
    conversionBackButton.hidden = true;
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

        if (!Number.isFinite(currentValue)) {
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
                computedValue = Math.sin(currentValue);
                displayExpression = `sin(${currentValue})`;
                break;
            case "cos":
                computedValue = Math.cos(currentValue);
                displayExpression = `cos(${currentValue})`;
                break;
            case "tan":
                computedValue = Math.tan(currentValue);
                displayExpression = `tan(${currentValue})`;
                break;
            case "log":
                computedValue = Math.log10(currentValue);
                displayExpression = `log(${currentValue})`;
                break;
            case "pi":
                computedValue = Math.PI;
                displayExpression = `π`;
                break;
            case "e":
                computedValue = Math.E;
                displayExpression = `e`;
                break;
        }

        calculation.textContent = displayExpression;
        result.textContent = formatResult(computedValue);
        expression = String(computedValue);
        finalized = true;
    });
});


/* =========================================================
   GLOBAL APP SHARE OPTION (SETTINGS)
   ========================================================= */

const shareAppSettingButton = document.getElementById("shareAppSettingButton");

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

const hapticsToggle = document.getElementById("hapticsToggle");

if (hapticsToggle) {
    // Load saved preference on startup
    const savedHaptics = localStorage.getItem("hapticsEnabled");
    if (savedHaptics === "false") {
        hapticsToggle.checked = false;
    } else {
        hapticsToggle.checked = true;
    }

    // Save preference when user changes the toggle
    hapticsToggle.addEventListener("change", function() {
        triggerHaptic();
        localStorage.setItem("hapticsEnabled", hapticsToggle.checked ? "true" : "false");
    });
}

// Check and hide ads on startup if already purchased
const adBanner = document.querySelector(".app-ad-banner");
if (localStorage.getItem("noAdsPurchased") === "true" && adBanner) {
    adBanner.style.display = "none";
}

// Handle the upgrade button click
const removeAdsButton = document.getElementById("removeAdsButton");
if (removeAdsButton) {
    removeAdsButton.addEventListener("click", function() {
        triggerHaptic();
        
        // (In a real app, you would trigger your payment gateway like Stripe or Google Play Billing here)
        let confirmed = confirm("Would you like to purchase permanent No-Ads for $1.99?");
        
        if (confirmed) {
            localStorage.setItem("noAdsPurchased", "true");
            if (adBanner) {
                adBanner.style.display = "none";
            }
            removeAdsButton.textContent = "✅ Ad-Free Active!";
            removeAdsButton.style.pointerEvents = "none";
        }
    });
}
/* =========================================================
   DESKTOP KEYBOARD SUPPORT
   ========================================================= */

window.addEventListener("keydown", function(event) {
    // Do not capture keystrokes if typing inside settings inputs or other text boxes
    if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) {
        return;
    }

    const key = event.key;

    if (!isNaN(key) || key === ".") {
        // Find and trigger matching number button
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
        event.preventDefault(); // Prevents browser quick-find search shortcut
        const btn = Array.from(operatorButtons).find(b => b.dataset.operator === "÷");
        if (btn) btn.click();
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
