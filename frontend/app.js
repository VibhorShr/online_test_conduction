const API_BASE_URL = 'http://127.0.0.1:8000/api';
let activeTimerId = null;
let adminSessionTimerId = null;
let activeAttemptSubmitted = false;
let activeTestTotalSeconds = 0;
let activeTestRemainingSeconds = 0;

const sampleResults = [
    { student: 'Aarav Mehta', test: 'Software Engineering Basics', score: 82, status: 'Passed' },
    { student: 'Priya Singh', test: 'DBMS Fundamentals', score: 76, status: 'Passed' },
    { student: 'Rohan Patel', test: 'JavaScript Quiz', score: 58, status: 'Review' }
];

const defaultTests = [
    {
        id: 1,
        title: 'Software Engineering Basics',
        subject: 'Software Engineering',
        duration: 30,
        questions: [
            {
                text: 'Which SDLC phase focuses on understanding user needs?',
                options: ['Design', 'Requirement Analysis', 'Testing', 'Deployment'],
                answer: 'Requirement Analysis'
            }
        ]
    },
    {
        id: 2,
        title: 'DBMS Fundamentals',
        subject: 'Database Management',
        duration: 25,
        questions: []
    }
];

function readLocalTests() {
    const savedTests = localStorage.getItem('otcs-tests');
    return savedTests ? JSON.parse(savedTests) : defaultTests;
}

function saveLocalTests(tests) {
    localStorage.setItem('otcs-tests', JSON.stringify(tests));
}

function readLocalResults() {
    const savedResults = localStorage.getItem('otcs-results');
    return savedResults ? JSON.parse(savedResults) : sampleResults;
}

function saveLocalResults(results) {
    localStorage.setItem('otcs-results', JSON.stringify(results));
}

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const error = new Error(errorBody.error || 'API request failed.');
        error.status = response.status;
        throw error;
    }

    return response.json();
}

async function registerAccount(payload) {
    const data = await apiRequest('/auth/register/', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    return data.account;
}

async function loginAccount(payload) {
    const data = await apiRequest('/auth/login/', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    return data.account;
}

function saveSessionAccount(account) {
    sessionStorage.setItem('otcs-account', JSON.stringify(account));
    if (account.role === 'student') {
        sessionStorage.setItem('otcs-student-name', account.fullName);
    }
}

function readSessionAccount() {
    const savedAccount = sessionStorage.getItem('otcs-account');
    return savedAccount ? JSON.parse(savedAccount) : null;
}

function clearActiveTimer() {
    if (activeTimerId) {
        clearInterval(activeTimerId);
        activeTimerId = null;
    }
    resetAnalogTimer();
    activeTestTotalSeconds = 0;
    activeTestRemainingSeconds = 0;
}

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function startAttemptTimer(test) {
    clearActiveTimer();
    activeAttemptSubmitted = false;

    const timerElement = document.getElementById('testTimer');
    const minuteHand = document.getElementById('timerMinuteHand');
    const secondHand = document.getElementById('timerSecondHand');
    const form = document.getElementById('attemptForm');
    const testDurationSeconds = Number(test.duration) * 60;
    const sessionRemainingSeconds = test.sessionEnd
        ? Math.max(0, Math.floor((new Date(test.sessionEnd).getTime() - Date.now()) / 1000))
        : testDurationSeconds;
    let remainingSeconds = Math.min(testDurationSeconds, sessionRemainingSeconds);

    if (!timerElement || !form || !remainingSeconds) return;

    activeTestTotalSeconds = remainingSeconds;
    activeTestRemainingSeconds = remainingSeconds;
    updateTimerDisplay(remainingSeconds, timerElement, minuteHand, secondHand);

    activeTimerId = setInterval(() => {
        remainingSeconds -= 1;
        activeTestRemainingSeconds = Math.max(remainingSeconds, 0);
        updateTimerDisplay(Math.max(remainingSeconds, 0), timerElement, minuteHand, secondHand);

        if (remainingSeconds <= 0) {
            clearActiveTimer();
            if (!activeAttemptSubmitted) {
                submitAttempt(test, true);
            }
        }
    }, 1000);
}

function resetAnalogTimer() {
    const minuteHand = document.getElementById('timerMinuteHand');
    const secondHand = document.getElementById('timerSecondHand');

    if (minuteHand) minuteHand.style.transform = 'translateX(-50%) rotate(0deg)';
    if (secondHand) secondHand.style.transform = 'translateX(-50%) rotate(0deg)';
}

function updateTimerDisplay(remainingSeconds, timerElement, minuteHand, secondHand) {
    timerElement.textContent = formatTime(remainingSeconds);
    timerElement.classList.toggle('danger', remainingSeconds <= 60);

    if (secondHand) {
        secondHand.style.transform = `translateX(-50%) rotate(${(remainingSeconds % 60) * 6}deg)`;
    }

    if (minuteHand) {
        const minuteRotation = ((remainingSeconds / 60) % 60) * 6;
        minuteHand.style.transform = `translateX(-50%) rotate(${minuteRotation}deg)`;
    }
}

function clearAdminSessionTimer() {
    if (adminSessionTimerId) {
        clearInterval(adminSessionTimerId);
        adminSessionTimerId = null;
    }

    const timerElement = document.getElementById('adminSessionTimer');
    const minuteHand = document.getElementById('adminTimerMinuteHand');
    const secondHand = document.getElementById('adminTimerSecondHand');

    if (timerElement) {
        timerElement.textContent = '00:00';
        timerElement.classList.remove('danger');
    }
    if (minuteHand) minuteHand.style.transform = 'translateX(-50%) rotate(0deg)';
    if (secondHand) secondHand.style.transform = 'translateX(-50%) rotate(0deg)';
}

function startAdminSessionTimer(totalSeconds) {
    clearAdminSessionTimer();

    const timerElement = document.getElementById('adminSessionTimer');
    const minuteHand = document.getElementById('adminTimerMinuteHand');
    const secondHand = document.getElementById('adminTimerSecondHand');
    let remainingSeconds = totalSeconds;

    if (!timerElement || !remainingSeconds) return;

    updateTimerDisplay(remainingSeconds, timerElement, minuteHand, secondHand);
    adminSessionTimerId = setInterval(() => {
        remainingSeconds -= 1;
        updateTimerDisplay(Math.max(remainingSeconds, 0), timerElement, minuteHand, secondHand);

        if (remainingSeconds <= 0) {
            clearAdminSessionTimer();
        }
    }, 1000);
}

async function loadTests() {
    try {
        const data = await apiRequest('/tests/');
        saveLocalTests(data.tests);
        return data.tests;
    } catch (error) {
        return readLocalTests();
    }
}

async function createTest(payload) {
    try {
        const account = readSessionAccount();
        const data = await apiRequest('/tests/', {
            method: 'POST',
            body: JSON.stringify({ ...payload, accountId: account?.id })
        });
        return data.test;
    } catch (error) {
        const tests = readLocalTests();
        const test = { id: Date.now(), ...payload, questions: [] };
        tests.push(test);
        saveLocalTests(tests);
        return test;
    }
}

async function addQuestion(testId, payload) {
    try {
        const data = await apiRequest(`/tests/${testId}/questions/`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return data.question;
    } catch (error) {
        const tests = readLocalTests();
        const selectedTest = tests.find((test) => test.id === testId);

        if (!selectedTest) {
            throw new Error('Please select a test first.');
        }

        selectedTest.questions.push(payload);
        saveLocalTests(tests);
        return payload;
    }
}

async function saveSession(testId, payload) {
    try {
        const data = await apiRequest(`/tests/${testId}/session/`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return data.test;
    } catch (error) {
        const tests = readLocalTests();
        const selectedTest = tests.find((test) => test.id === testId);

        if (!selectedTest) {
            throw new Error('Please select a test first.');
        }

        selectedTest.sessionStart = payload.sessionStart;
        selectedTest.sessionEnd = payload.sessionEnd;
        selectedTest.sessionStatus = getSessionStatus(selectedTest);
        saveLocalTests(tests);
        return selectedTest;
    }
}

async function loadResults() {
    try {
        const data = await apiRequest('/attempts/');
        const results = data.results.length ? data.results : sampleResults;
        saveLocalResults(results);
        return results;
    } catch (error) {
        return readLocalResults();
    }
}

async function saveAttempt(payload, fallbackTest) {
    try {
        const data = await apiRequest('/attempts/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return data.result;
    } catch (error) {
        if (error.status) {
            throw error;
        }

        const correctCount = fallbackTest.questions.reduce((count, question, index) => {
            return payload.answers[index] === question.answer ? count + 1 : count;
        }, 0);
        const score = Math.round((correctCount / fallbackTest.questions.length) * 100);
        const result = {
            student: payload.studentName,
            test: fallbackTest.title,
            score,
            status: score >= 60 ? 'Passed' : 'Review',
            correctCount,
            totalQuestions: fallbackTest.questions.length,
            completionSeconds: payload.completionSeconds || 0,
            submittedAt: new Date().toISOString()
        };
        const results = readLocalResults();
        results.push(result);
        saveLocalResults(results);
        return result;
    }
}

function escapeHTML(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function showMessage(targetId, message, type = 'success') {
    const target = document.getElementById(targetId);
    if (!target) return;

    target.textContent = message;
    target.className = `form-message ${type}`;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authTabs = document.querySelectorAll('[data-auth-mode]');
    const roleInputs = document.querySelectorAll('input[name="authRole"]');

    if (!loginForm || !registerForm) return;

    authTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const mode = tab.dataset.authMode;
            authTabs.forEach((item) => item.classList.toggle('active', item === tab));
            loginForm.classList.toggle('hidden', mode !== 'login');
            registerForm.classList.toggle('hidden', mode !== 'register');
            showMessage('loginMessage', '');
            showMessage('registerMessage', '');
        });
    });

    roleInputs.forEach((input) => {
        input.addEventListener('change', () => {
            showMessage('loginMessage', '');
            showMessage('registerMessage', '');
        });
    });

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(loginForm);
        const role = getSelectedRole();

        try {
            const account = await loginAccount({
                identifier: formData.get('identifier').trim(),
                password: formData.get('password'),
                role
            });
            saveSessionAccount(account);
            window.location.href = account.role === 'admin' ? 'admin.html' : 'student.html';
        } catch (error) {
            showMessage('loginMessage', error.message, 'error');
        }
    });

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(registerForm);
        const role = getSelectedRole();

        try {
            const account = await registerAccount({
                fullName: formData.get('fullName').trim(),
                username: formData.get('username').trim(),
                email: formData.get('email').trim(),
                password: formData.get('password'),
                role
            });
            saveSessionAccount(account);
            window.location.href = account.role === 'admin' ? 'admin.html' : 'student.html';
        } catch (error) {
            showMessage('registerMessage', error.message, 'error');
        }
    });
}

function getSelectedRole() {
    return document.querySelector('input[name="authRole"]:checked')?.value || 'student';
}

function initAdminPage() {
    const testForm = document.getElementById('testForm');
    const questionForm = document.getElementById('questionForm');
    const sessionForm = document.getElementById('sessionForm');
    const testSelect = document.getElementById('questionTest');
    const endSessionButton = document.getElementById('endSession');

    if (!testForm || !questionForm || !sessionForm || !testSelect) return;

    const account = readSessionAccount();
    if (!account || account.role !== 'admin') {
        window.location.href = '/';
        return;
    }

    renderAdminDashboard();

    testForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(testForm);

        await createTest({
            title: formData.get('title').trim(),
            subject: formData.get('subject').trim(),
            duration: Number(formData.get('duration'))
        });

        testForm.reset();
        await renderAdminDashboard();
        showMessage('testMessage', 'Test created successfully.');
    });

    questionForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(questionForm);
        const selectedTestId = Number(formData.get('testId'));
        const answerValue = formData.get(`option${formData.get('answer')}`).trim();

        try {
            await addQuestion(selectedTestId, {
                text: formData.get('question').trim(),
                options: [
                    formData.get('optionA').trim(),
                    formData.get('optionB').trim(),
                    formData.get('optionC').trim(),
                    formData.get('optionD').trim()
                ],
                answer: answerValue
            });
            questionForm.reset();
            await renderAdminDashboard();
            showMessage('questionMessage', 'Question added successfully.');
        } catch (error) {
            showMessage('questionMessage', error.message, 'error');
        }
    });

    sessionForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(sessionForm);
        const selectedTestId = Number(formData.get('testId'));
        const sessionDuration = Number(formData.get('sessionDuration'));
        const sessionStart = new Date();
        const sessionEnd = new Date(sessionStart.getTime() + sessionDuration * 60 * 1000);

        try {
            await saveSession(selectedTestId, {
                sessionStart: sessionStart.toISOString(),
                sessionEnd: sessionEnd.toISOString()
            });
            sessionForm.reset();
            await renderAdminDashboard();
            startAdminSessionTimer(sessionDuration * 60);
            showMessage('sessionMessage', `Session started for ${sessionDuration} minutes.`);
        } catch (error) {
            showMessage('sessionMessage', error.message, 'error');
        }
    });

    endSessionButton?.addEventListener('click', async () => {
        const formData = new FormData(sessionForm);
        const selectedTestId = Number(formData.get('testId'));

        if (!selectedTestId) {
            showMessage('sessionMessage', 'Please select a test first.', 'error');
            return;
        }

        try {
            const tests = await loadTests();
            const selectedTest = tests.find((test) => Number(test.id) === selectedTestId);
            const sessionEnd = new Date();
            let sessionStart = selectedTest?.sessionStart
                ? new Date(selectedTest.sessionStart)
                : new Date(sessionEnd.getTime() - 1000);

            if (Number.isNaN(sessionStart.getTime()) || sessionStart >= sessionEnd) {
                sessionStart = new Date(sessionEnd.getTime() - 1000);
            }

            await saveSession(selectedTestId, {
                sessionStart: sessionStart.toISOString(),
                sessionEnd: sessionEnd.toISOString()
            });
            sessionForm.reset();
            await renderAdminDashboard();
            clearAdminSessionTimer();
            showMessage('sessionMessage', 'Session ended successfully.');
        } catch (error) {
            showMessage('sessionMessage', error.message, 'error');
        }
    });
}

async function renderAdminDashboard() {
    const tests = await loadTests();
    const results = await loadResults();
    const totalQuestions = tests.reduce((sum, test) => sum + test.questions.length, 0);
    const averageScore = Math.round(
        results.reduce((sum, result) => sum + result.score, 0) / results.length
    );

    setText('totalTests', tests.length);
    setText('totalQuestions', totalQuestions);
    setText('totalAttempts', results.length);
    setText('averageScore', `${Number.isNaN(averageScore) ? 0 : averageScore}%`);

    renderTestOptions(tests);
    renderSessionOptions(tests);
    renderTestTable(tests);
    renderResultsTable(results);
}

function renderTestOptions(tests) {
    const testSelect = document.getElementById('questionTest');
    testSelect.innerHTML = '<option value="">Select test</option>';

    tests.forEach((test) => {
        const option = document.createElement('option');
        option.value = test.id;
        option.textContent = test.title;
        testSelect.appendChild(option);
    });
}

function renderSessionOptions(tests) {
    const testSelect = document.getElementById('sessionTest');
    if (!testSelect) return;

    testSelect.innerHTML = '<option value="">Select test</option>';

    tests.forEach((test) => {
        const option = document.createElement('option');
        option.value = test.id;
        option.textContent = test.title;
        testSelect.appendChild(option);
    });
}

function renderTestTable(tests) {
    const tableBody = document.getElementById('testTableBody');
    tableBody.innerHTML = '';

    tests.forEach((test) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHTML(test.title)}</td>
            <td>${escapeHTML(test.subject)}</td>
            <td>${escapeHTML(test.duration)} min</td>
            <td>${escapeHTML(test.questions.length)}</td>
        `;
        tableBody.appendChild(row);
    });
}

function getSessionStatus(test) {
    if (!test.sessionStart || !test.sessionEnd) return 'not_scheduled';

    const now = Date.now();
    const startsAt = new Date(test.sessionStart).getTime();
    const endsAt = new Date(test.sessionEnd).getTime();

    if (now < startsAt) return 'upcoming';
    if (now > endsAt) return 'closed';
    return 'active';
}

function formatSessionWindow(test) {
    if (!test.sessionStart || !test.sessionEnd) return 'Not scheduled';

    const startsAt = new Date(test.sessionStart);
    const endsAt = new Date(test.sessionEnd);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return 'Not scheduled';

    return `${startsAt.toLocaleString([], {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })} - ${endsAt.toLocaleString([], {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })}`;
}

function renderResultsTable(results) {
    const tableBody = document.getElementById('resultsTableBody');
    tableBody.innerHTML = '';

    const sortedResults = [...results].sort((a, b) => {
        const scoreDiff = Number(b.score) - Number(a.score);
        if (scoreDiff !== 0) return scoreDiff;
        return new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0);
    });

    sortedResults.forEach((result) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHTML(result.student)}</td>
            <td>${escapeHTML(result.test)}</td>
            <td>${escapeHTML(result.score)}%</td>
            <td>${escapeHTML(formatCompletionTime(result.completionSeconds))}</td>
            <td><span class="status-pill">${escapeHTML(result.status)}</span></td>
        `;
        tableBody.appendChild(row);
    });
}

function formatCompletionTime(value) {
    const totalSeconds = Number(value);
    if (!totalSeconds) return 'Not saved';

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) return `${seconds} sec`;
    if (seconds === 0) return `${minutes} min`;
    return `${minutes} min ${seconds} sec`;
}

function initStudentPage() {
    const testList = document.getElementById('studentTestList');
    const attemptArea = document.getElementById('attemptArea');
    const studentNameTarget = document.getElementById('studentName');

    if (!testList || !attemptArea) return;

    const account = readSessionAccount();
    if (!account || account.role !== 'student') {
        window.location.href = '/';
        return;
    }

    const studentName = account.fullName || sessionStorage.getItem('otcs-student-name') || 'Student';
    if (studentNameTarget) studentNameTarget.textContent = studentName;

    renderStudentTests();
}

async function renderStudentTests() {
    clearActiveTimer();
    const tests = await loadTests();
    const testList = document.getElementById('studentTestList');
    const attemptArea = document.getElementById('attemptArea');
    testList.innerHTML = '';

    if (tests.length === 0) {
        testList.innerHTML = '<p class="empty-state">No tests are available right now.</p>';
        return;
    }

    tests.forEach((test) => {
        const sessionStatus = getSessionStatus(test);
        const canStart = test.questions.length > 0 && sessionStatus === 'active';
        const sessionMessage = getStudentSessionMessage(test, sessionStatus);
        const card = document.createElement('article');
        card.className = 'student-test-card';
        card.innerHTML = `
            <div>
                <h2>${escapeHTML(test.title)}</h2>
                <p>${escapeHTML(test.subject)}</p>
            </div>
            <dl>
                <div><dt>Duration</dt><dd>${escapeHTML(test.duration)} min</dd></div>
                <div><dt>Questions</dt><dd>${escapeHTML(test.questions.length)}</dd></div>
            </dl>
            <p class="session-note ${sessionStatus}">${escapeHTML(sessionMessage)}</p>
            <button type="button" ${canStart ? '' : 'disabled'}>
                ${canStart ? 'Start Test' : 'Unavailable'}
            </button>
        `;

        const button = card.querySelector('button');
        if (canStart) {
            button.addEventListener('click', () => renderAttempt(test.id));
        }
        testList.appendChild(card);
    });

    attemptArea.innerHTML = `
        <div class="student-welcome">
            <h2>Select a Test</h2>
            <p>Choose an available test from the list to begin your attempt.</p>
        </div>
    `;
}

function getStudentSessionMessage(test, sessionStatus) {
    if (test.questions.length === 0) return 'No questions added yet.';
    if (sessionStatus === 'not_scheduled') return 'Session time not scheduled.';
    if (sessionStatus === 'active') return 'Session is active now.';
    if (sessionStatus === 'upcoming') return `Starts ${formatSessionPoint(test.sessionStart)}.`;
    return `Closed ${formatSessionPoint(test.sessionEnd)}.`;
}

function formatSessionPoint(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString([], {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function renderAttempt(testId) {
    const tests = await loadTests();
    const test = tests.find((item) => item.id === testId);
    const attemptArea = document.getElementById('attemptArea');

    if (!test || test.questions.length === 0) return;
    if (getSessionStatus(test) !== 'active') {
        attemptArea.innerHTML = `
            <div class="student-welcome">
                <h2>Session Unavailable</h2>
                <p>This test can be attempted only during the session time selected by admin.</p>
            </div>
        `;
        return;
    }

    attemptArea.innerHTML = `
        <div class="attempt-header">
            <div>
                <p class="eyebrow dark">Test Attempt</p>
                <h2>${escapeHTML(test.title)}</h2>
                <p>${escapeHTML(test.subject)} | ${escapeHTML(test.duration)} minutes</p>
            </div>
            <div class="attempt-controls">
                <div class="timer-box">
                    <span>Time Left</span>
                    <strong id="testTimer">00:00</strong>
                </div>
                <button type="button" id="backToTests">Back</button>
            </div>
        </div>
        <form id="attemptForm" class="attempt-form">
            ${test.questions.map((question, index) => `
                <fieldset>
                    <legend>${index + 1}. ${escapeHTML(question.text)}</legend>
                    ${question.options.map((option) => `
                        <label>
                            <input type="radio" name="question-${index}" value="${escapeHTML(option)}" required>
                            ${escapeHTML(option)}
                        </label>
                    `).join('')}
                </fieldset>
            `).join('')}
            <button type="submit">Submit Test</button>
        </form>
    `;

    document.getElementById('backToTests').addEventListener('click', () => {
        clearActiveTimer();
        renderStudentTests();
    });
    document.getElementById('attemptForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        await submitAttempt(test);
    });
    startAttemptTimer(test);
}

async function submitAttempt(test, isAutoSubmit = false) {
    if (activeAttemptSubmitted) return;
    activeAttemptSubmitted = true;
    const completionSeconds = activeTestTotalSeconds
        ? activeTestTotalSeconds - activeTestRemainingSeconds
        : Number(test.duration) * 60;
    clearActiveTimer();

    const form = document.getElementById('attemptForm');
    const formData = new FormData(form);
    const answers = {};

    test.questions.forEach((question, index) => {
        answers[index] = formData.get(`question-${index}`);
    });

    const account = readSessionAccount();
    const studentName = account?.fullName || sessionStorage.getItem('otcs-student-name') || 'Student';
    let result;

    try {
        result = await saveAttempt({
            studentName,
            testId: test.id,
            answers,
            accountId: account?.id,
            completionSeconds
        }, test);
    } catch (error) {
        renderSessionEndedMessage(error.message);
        return;
    }

    renderResultSummary(
        test,
        result.correctCount ?? result.correct_count ?? 0,
        result.score,
        answers,
        isAutoSubmit
    );
}

function renderSessionEndedMessage(message) {
    const attemptArea = document.getElementById('attemptArea');
    attemptArea.innerHTML = `
        <div class="student-welcome">
            <h2>Session Ended</h2>
            <p>${escapeHTML(message || 'This test session has ended.')}</p>
            <button type="button" id="backAfterSessionEnd">Back to Tests</button>
        </div>
    `;

    document.getElementById('backAfterSessionEnd').addEventListener('click', renderStudentTests);
}

function renderQuestionReview(test, answers) {
    return test.questions.map((question, index) => {
        const selectedAnswer = answers[index];
        const isCorrect = selectedAnswer === question.answer;

        return `
            <article class="review-card ${isCorrect ? 'correct' : 'wrong'}">
                <div class="review-question-header">
                    <h3>${index + 1}. ${escapeHTML(question.text)}</h3>
                    <span>${isCorrect ? 'Correct' : 'Wrong'}</span>
                </div>
                <div class="review-options">
                    ${question.options.map((option) => {
                        const optionClass = option === question.answer
                            ? 'correct-option'
                            : option === selectedAnswer
                                ? 'wrong-option'
                                : '';

                        return `
                            <div class="review-option ${optionClass}">
                                ${escapeHTML(option)}
                            </div>
                        `;
                    }).join('')}
                </div>
                <p>Your answer: <strong>${escapeHTML(selectedAnswer || 'Not answered')}</strong></p>
                <p>Correct answer: <strong>${escapeHTML(question.answer)}</strong></p>
            </article>
        `;
    }).join('');
}

function renderResultSummary(test, correctCount, score, answers = {}, isAutoSubmit = false) {
    const attemptArea = document.getElementById('attemptArea');
    attemptArea.innerHTML = `
        <section class="result-summary">
            <p class="eyebrow dark">${isAutoSubmit ? 'Auto Submitted' : 'Submitted'}</p>
            <h2>${escapeHTML(test.title)}</h2>
            <strong>${escapeHTML(score)}%</strong>
            <p>You answered ${escapeHTML(correctCount)} out of ${escapeHTML(test.questions.length)} questions correctly.</p>
            ${isAutoSubmit ? '<p class="auto-submit-note">Time completed, so your test was submitted automatically.</p>' : ''}
            <div class="review-section">
                <div class="section-heading">
                    <h2>Question Review</h2>
                    <p>Green shows correct answers. Red shows your wrong selected answer.</p>
                </div>
                ${renderQuestionReview(test, answers)}
            </div>
            <div class="result-actions">
                <button type="button" id="takeAnotherTest">Take Another Test</button>
                <a href="/">Logout</a>
            </div>
        </section>
    `;

    document.getElementById('takeAnotherTest').addEventListener('click', renderStudentTests);
}

document.addEventListener('DOMContentLoaded', () => {
    initLoginPage();
    initAdminPage();
    initStudentPage();
});
