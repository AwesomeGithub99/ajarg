/**
 * Quiz Logic - script.js
 */

// 1. Global State Variables
let allQuestions = [];
let activeQuestions = [];
let currentIdx = 0;
let correctCount = 0;
let wrongCount = 0;
let selectedOption = null;
let selectedButton = null;
let selectedLimit = null;
let autoAdvanceTimer = null;

let quizSettings = {
    showFeedback: true,
    onlyWrongFeedback: false,
    autoAdvance: false,
    autoCorrectOnly: false
};

// 2. Initialization - Runs when the page loads
async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    let fileName = urlParams.get('type') || window.location.pathname.split('/').pop().replace('.html', '');
    let fileIndex = 0;
    let datasetsFound = 0;
    let consecutiveFailures = 0;

    while (consecutiveFailures < 3 && fileIndex < 50) {
        let path = fileIndex === 0 ? `quizjson/${fileName}.json` : `quizjson/${fileName}${fileIndex}.json`;
        try {
            const res = await fetch(path);
            if (!res.ok) {
                consecutiveFailures++;
            } else {
                const data = await res.json();
                consecutiveFailures = 0;
                if (datasetsFound === 0 && data.title) {
                    document.getElementById('display-title').innerText = data.title;
                    document.title = data.title;
                }
                let questions = data.questions || (Array.isArray(data) ? data : []);
                if (questions.length > 0) {
                    allQuestions = allQuestions.concat(questions);
                    datasetsFound++;
                }
            }
        } catch (e) {
            consecutiveFailures++;
        }
        fileIndex++;
    }

    const count = allQuestions.length;
    if (count > 0) {
        document.getElementById('avail-text').innerText = `${count} questions found.`;
        document.getElementById('btn-10').disabled = false;
        document.getElementById('btn-25').disabled = count < 11;
        document.getElementById('btn-50').disabled = count < 26;
        document.getElementById('btn-100').disabled = count < 51;
    }
}

// 3. UI and Setup Functions
function toggleFeedbackSettings() {
    const isMasterEnabled = document.getElementById('setting-show-feedback').checked;
    const subSettingRow = document.getElementById('sub-setting-container');
    isMasterEnabled ? subSettingRow.classList.remove('disabled') : subSettingRow.classList.add('disabled');
}

function toggleAutoAdvanceSettings() {
    const isMasterEnabled = document.getElementById('setting-auto-advance').checked;
    const subSettingRow = document.getElementById('auto-advance-sub-container');
    isMasterEnabled ? subSettingRow.classList.remove('disabled') : subSettingRow.classList.add('disabled');
}

function selectRange(limit, btn) {
    if (selectedLimit === limit) {
        selectedLimit = null;
        btn.classList.remove('selected');
        document.getElementById('start-container').style.display = 'none';
    } else {
        selectedLimit = limit;
        document.querySelectorAll('.range-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('start-container').style.display = 'block';
    }
}

function confirmStart() {
    if (selectedLimit) startQuiz(selectedLimit);
}

function startQuiz(limit) {
    quizSettings.showFeedback = document.getElementById('setting-show-feedback').checked;
    quizSettings.onlyWrongFeedback = document.getElementById('setting-only-wrong-feedback').checked;
    quizSettings.autoAdvance = document.getElementById('setting-auto-advance').checked;
    quizSettings.autoCorrectOnly = document.getElementById('setting-auto-correct-only').checked;

    document.getElementById('main-header').classList.remove('header-hidden');
    activeQuestions = [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, limit);
    document.getElementById('total-q-num').innerText = activeQuestions.length;
    document.getElementById('setup').classList.remove('active');
    document.getElementById('quiz').classList.add('active');
    showQuestion();
}

// 4. Core Quiz Logic
function showQuestion() {
    const q = activeQuestions[currentIdx];
    selectedOption = null;
    selectedButton = null;
    if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);

    document.getElementById('current-q-num').innerText = currentIdx + 1;
    document.getElementById('question-text').innerText = q.question;
    document.getElementById('progress-bar').style.width = (currentIdx / activeQuestions.length) * 100 + "%";

    const container = document.getElementById('options-container');
    container.innerHTML = '';

    closeFeedback();
    document.getElementById('submit-action-area').style.display = 'none';
    document.getElementById('quiz-action-area').style.display = 'none';
    document.getElementById('review-btn').style.display = 'none';

    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => selectAnswer(opt, btn);
        container.appendChild(btn);
    });
}

function selectAnswer(choice, btn) {
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedOption = choice;
    selectedButton = btn;
    document.getElementById('submit-action-area').style.display = 'block';
}

function processSubmission() {
    const q = activeQuestions[currentIdx];
    const isCorrect = selectedOption === q.answer;

    document.getElementById('submit-action-area').style.display = 'none';

    document.querySelectorAll('.option-btn').forEach(b => {
        b.disabled = true;
        b.classList.remove('selected');
        if (b.innerText === q.answer) b.classList.add('correct-choice');
    });

    if (isCorrect) {
        correctCount++;
        document.getElementById('score-right').innerText = correctCount;
    } else {
        wrongCount++;
        selectedButton.classList.add('wrong-choice');
        document.getElementById('score-wrong').innerText = wrongCount;
    }

    updateFeedbackUI(isCorrect, q);

    let willAutoAdvance = false;
    if (quizSettings.autoAdvance) {
        willAutoAdvance = !quizSettings.autoCorrectOnly || (quizSettings.autoCorrectOnly && isCorrect);
    }

    if (willAutoAdvance) {
        autoAdvanceTimer = setTimeout(() => {
            nextQuestion();
        }, 800);
    } else {
        document.getElementById('quiz-action-area').style.display = 'block';
        let shouldAutoShow = quizSettings.showFeedback;
        if (quizSettings.onlyWrongFeedback && isCorrect) shouldAutoShow = false;

        if (shouldAutoShow) openFeedback();
        document.getElementById('review-btn').style.display = 'inline-block';
    }
}

// 5. Feedback and Results
function updateFeedbackUI(isCorrect, q) {
    const resText = document.getElementById('result-text');
    const expText = document.getElementById('explanation-text');
    const reveal = document.getElementById('correct-reveal');

    reveal.innerText = "Correct Answer: " + q.answer;
    if (isCorrect) {
        resText.innerText = "✓ Correct Selection";
        resText.style.color = "var(--success-green, #48bb78)";
        expText.innerText = q.explanation || "Your selection aligns with the correct criteria.";
    } else {
        resText.innerText = "✗ Incorrect Selection";
        resText.style.color = "var(--error-red, #f56565)";
        const distractorText = (q.distractors && q.distractors[selectedOption]) ? q.distractors[selectedOption] : "This choice does not match the requirements.";
        expText.innerText = distractorText + " " + (q.explanation || "");
    }
}

function openFeedback() {
    const fb = document.getElementById('feedback-box');
    fb.style.display = 'flex';
    document.getElementById('overlay-mask').style.display = 'block';
    setTimeout(() => fb.classList.add('show'), 10);
}

function closeFeedback() {
    const fb = document.getElementById('feedback-box');
    fb.classList.remove('show');
    document.getElementById('overlay-mask').style.display = 'none';
    setTimeout(() => {
        if (!fb.classList.contains('show')) fb.style.display = 'none';
    }, 300);
}

function nextQuestion() {
    if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
    currentIdx++;
    if (currentIdx < activeQuestions.length) showQuestion();
    else showResults();
}

function showResults() {
    document.getElementById('quiz').classList.remove('active');
    document.getElementById('result').classList.add('active');
    const percent = Math.round((correctCount / activeQuestions.length) * 100);
    document.getElementById('final-percent').innerText = percent + "%";
    document.getElementById('final-stat-summary').innerText = `Final Score: ${correctCount} correct out of ${activeQuestions.length} total questions.`;
    document.getElementById('main-header').classList.remove('header-hidden');
}

// Kick it off!
window.addEventListener('DOMContentLoaded', init);